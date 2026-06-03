-- ============================================================================
-- Blood Bank Cross-Match — atomic RPC functions
-- ----------------------------------------------------------------------------
-- The cross-match create/approve flows perform multi-table writes (cross-match
-- request + blood-unit status + unit assignments) that MUST be atomic. The
-- backend was migrated from Drizzle (db.transaction) to the Supabase JS client,
-- which has no multi-statement transactions — so the atomic writes live here as
-- PL/pgSQL functions and are invoked via supabase.rpc(). Each function body runs
-- in a single implicit transaction, preserving the original guarantees.
--
-- All validation (staff/patient/encounter resolution, ABO/Rh compatibility,
-- unit-availability checks) still happens in the service layer BEFORE these are
-- called. These functions only perform the resolved, atomic state changes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create a cross-match request and (optionally) reserve donor units atomically.
-- p_request: jsonb with all already-resolved column values.
-- p_blood_unit_ids: donor unit ids to reserve (may be empty).
-- Returns the new cross_match_requests.id.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bb_create_cross_match(
	p_request jsonb,
	p_blood_unit_ids uuid[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
	v_id uuid;
BEGIN
	INSERT INTO cross_match_requests (
		facility_id,
		patient_id,
		encounter_id,
		source_lab_order_id,
		blood_type,
		component_type,
		units_requested,
		urgency,
		clinical_indication,
		compatibility_result,
		status,
		requested_by_staff_id,
		cross_matched_by_staff_id,
		cross_matched_at
	)
	VALUES (
		(p_request->>'facility_id')::uuid,
		(p_request->>'patient_id')::uuid,
		(p_request->>'encounter_id')::uuid,
		(p_request->>'source_lab_order_id')::uuid,
		(p_request->>'blood_type'),
		(p_request->>'component_type'),
		(p_request->>'units_requested')::integer,
		(p_request->>'urgency'),
		(p_request->>'clinical_indication'),
		(p_request->>'compatibility_result'),
		(p_request->>'status'),
		(p_request->>'requested_by_staff_id')::uuid,
		(p_request->>'cross_matched_by_staff_id')::uuid,
		(p_request->>'cross_matched_at')::timestamp
	)
	RETURNING id INTO v_id;

	IF array_length(p_blood_unit_ids, 1) > 0 THEN
		UPDATE blood_units
		SET status = 'reserved', updated_at = now()
		WHERE id = ANY (p_blood_unit_ids);

		INSERT INTO cross_match_unit_assignments (cross_match_request_id, blood_unit_id, status)
		SELECT v_id, unnest(p_blood_unit_ids), 'reserved';
	END IF;

	RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Approve as INCOMPATIBLE: release any reserved units and cancel the request.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bb_approve_cross_match_incompatible(
	p_id uuid,
	p_staff_id uuid,
	p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
	UPDATE blood_units
	SET status = 'available', updated_at = now()
	WHERE id IN (
		SELECT blood_unit_id
		FROM cross_match_unit_assignments
		WHERE cross_match_request_id = p_id
	);

	UPDATE cross_match_unit_assignments
	SET status = 'released', updated_at = now()
	WHERE cross_match_request_id = p_id;

	UPDATE cross_match_requests
	SET
		status = 'cancelled',
		compatibility_result = 'incompatible',
		cross_matched_by_staff_id = p_staff_id,
		cross_matched_at = now(),
		approved_by_staff_id = p_staff_id,
		approved_at = now(),
		cancelled_by_staff_id = p_staff_id,
		cancelled_at = now(),
		rejection_reason = COALESCE(p_rejection_reason, 'Cross-match incompatible'),
		updated_at = now()
	WHERE id = p_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Approve as COMPATIBLE: reserve the assigned units, record new assignments,
-- and mark the request approved.
-- p_blood_unit_ids: full set of units that should be reserved for the request.
-- p_new_blood_unit_ids: subset that does not yet have an assignment row.
-- p_cross_matched_at: existing crossMatchedAt to preserve, or null for now().
-- A guard raises if any unit can no longer be reserved (concurrent change).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bb_approve_cross_match_compatible(
	p_id uuid,
	p_blood_unit_ids uuid[],
	p_new_blood_unit_ids uuid[],
	p_staff_id uuid,
	p_cross_matched_at timestamp DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	v_updated integer;
BEGIN
	IF array_length(p_blood_unit_ids, 1) > 0 THEN
		UPDATE blood_units
		SET status = 'reserved', updated_at = now()
		WHERE id = ANY (p_blood_unit_ids)
			AND status IN ('available', 'reserved');

		GET DIAGNOSTICS v_updated = ROW_COUNT;
		IF v_updated <> array_length(p_blood_unit_ids, 1) THEN
			RAISE EXCEPTION 'One or more blood units are no longer available for reservation';
		END IF;

		IF array_length(p_new_blood_unit_ids, 1) > 0 THEN
			INSERT INTO cross_match_unit_assignments (cross_match_request_id, blood_unit_id, status)
			SELECT p_id, unnest(p_new_blood_unit_ids), 'reserved';
		END IF;
	END IF;

	UPDATE cross_match_requests
	SET
		status = 'approved',
		compatibility_result = 'compatible',
		cross_matched_by_staff_id = p_staff_id,
		cross_matched_at = COALESCE(p_cross_matched_at, now()),
		approved_by_staff_id = p_staff_id,
		approved_at = now(),
		rejection_reason = NULL,
		updated_at = now()
	WHERE id = p_id;
END;
$$;

-- Allow the Supabase service role (and authenticated callers via PostgREST) to
-- execute the RPCs.
GRANT EXECUTE ON FUNCTION bb_create_cross_match(jsonb, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION bb_approve_cross_match_incompatible(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION bb_approve_cross_match_compatible(uuid, uuid[], uuid[], uuid, timestamp) TO service_role;

-- Refresh PostgREST's schema cache so the functions are immediately callable.
NOTIFY pgrst, 'reload schema';

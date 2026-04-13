-- =============================================================================
-- RLS Policies — Facility-scoped Row-Level Security
--
-- Every clinical table has an RLS policy filtering rows by facility_id.
-- At the start of each request, the RBAC middleware sets:
--   SET LOCAL app.current_facility_id = '<uuid>'
-- RLS policies use current_setting('app.current_facility_id') to filter rows.
-- This ensures bulletproof data isolation even if app-level WHERE clauses are omitted.
-- =============================================================================

-- Enable RLS on all clinical tables that have facility_id

-- RBAC
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Core
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_census_snapshots ENABLE ROW LEVEL SECURITY;

-- Clinical
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_addenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

-- Orders
ALTER TABLE medication_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Formulary
ALTER TABLE formulary_items ENABLE ROW LEVEL SECURITY;

-- Nursing
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowsheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE io_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hai_tags ENABLE ROW LEVEL SECURITY;

-- Billing
ALTER TABLE charge_master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf4_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_checks ENABLE ROW LEVEL SECURITY;

-- Reporting
ALTER TABLE pidsr_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveillance_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahsr_snapshots ENABLE ROW LEVEL SECURITY;

-- Audit
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_glass_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Helper: bypass RLS for superuser/service role connections
-- Application connections must use a non-superuser role so RLS applies.
-- =============================================================================

-- RBAC policies (roles scoped by facility)
CREATE POLICY facilities_facility_isolation ON facilities
    FOR ALL USING (id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (id::text = current_setting('app.current_facility_id', true));

CREATE POLICY staff_profiles_facility_isolation ON staff_profiles
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY roles_facility_isolation ON roles
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY role_permissions_facility_isolation ON role_permissions
    FOR ALL USING (role_id IN (
        SELECT id FROM roles
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ))
    WITH CHECK (role_id IN (
        SELECT id FROM roles
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ));

CREATE POLICY user_roles_facility_isolation ON user_roles
    FOR ALL USING (staff_profile_id IN (
        SELECT id FROM staff_profiles
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ))
    WITH CHECK (staff_profile_id IN (
        SELECT id FROM staff_profiles
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ));

-- Core policies
CREATE POLICY patients_facility_isolation ON patients
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY encounters_facility_isolation ON encounters
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY pre_encounters_facility_isolation ON pre_encounters
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY encounter_transfers_facility_isolation ON encounter_transfers
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY wards_facility_isolation ON wards
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY beds_facility_isolation ON beds
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY bed_census_snapshots_facility_isolation ON bed_census_snapshots
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

-- Clinical policies
CREATE POLICY clinical_notes_facility_isolation ON clinical_notes
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY note_addenda_facility_isolation ON note_addenda
    FOR ALL USING (note_id IN (
        SELECT id FROM clinical_notes
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ))
    WITH CHECK (note_id IN (
        SELECT id FROM clinical_notes
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ));

CREATE POLICY note_templates_facility_isolation ON note_templates
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY consent_records_facility_isolation ON consent_records
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY problems_facility_isolation ON problems
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY allergies_facility_isolation ON allergies
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

-- Orders policies
CREATE POLICY medication_orders_facility_isolation ON medication_orders
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY lab_orders_facility_isolation ON lab_orders
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY imaging_orders_facility_isolation ON imaging_orders
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY order_verifications_facility_isolation ON order_verifications
    FOR ALL USING (medication_order_id IN (
        SELECT id FROM medication_orders
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ))
    WITH CHECK (medication_order_id IN (
        SELECT id FROM medication_orders
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ));

CREATE POLICY prescriptions_facility_isolation ON prescriptions
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

-- Formulary policies
CREATE POLICY formulary_items_facility_isolation ON formulary_items
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

-- Nursing policies
CREATE POLICY vital_signs_facility_isolation ON vital_signs
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY flowsheet_entries_facility_isolation ON flowsheet_entries
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY mar_entries_facility_isolation ON mar_entries
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY tar_entries_facility_isolation ON tar_entries
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY io_entries_facility_isolation ON io_entries
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY shift_handoffs_facility_isolation ON shift_handoffs
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY hai_tags_facility_isolation ON hai_tags
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

-- Billing policies
CREATE POLICY charge_master_items_facility_isolation ON charge_master_items
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY charges_facility_isolation ON charges
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY invoices_facility_isolation ON invoices
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY invoice_line_items_facility_isolation ON invoice_line_items
    FOR ALL USING (invoice_id IN (
        SELECT id FROM invoices
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ))
    WITH CHECK (invoice_id IN (
        SELECT id FROM invoices
        WHERE facility_id::text = current_setting('app.current_facility_id', true)
    ));

CREATE POLICY payments_facility_isolation ON payments
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY cf4_claims_facility_isolation ON cf4_claims
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY eligibility_checks_facility_isolation ON eligibility_checks
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

-- Reporting policies
CREATE POLICY pidsr_cases_facility_isolation ON pidsr_cases
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY surveillance_flags_facility_isolation ON surveillance_flags
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY ahsr_snapshots_facility_isolation ON ahsr_snapshots
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

-- Audit policies
CREATE POLICY audit_logs_facility_isolation ON audit_logs
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY break_glass_events_facility_isolation ON break_glass_events
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

CREATE POLICY notifications_facility_isolation ON notifications
    FOR ALL USING (facility_id::text = current_setting('app.current_facility_id', true))
    WITH CHECK (facility_id::text = current_setting('app.current_facility_id', true));

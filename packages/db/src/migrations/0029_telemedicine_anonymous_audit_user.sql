-- Telemedicine public patient invite flows are anonymous by design, but audit_logs.user_id
-- is required. Keep a stable pseudo-user for those immutable audit rows.
insert into "users" (
	"id",
	"name",
	"email",
	"email_verified",
	"created_at",
	"updated_at",
	"two_factor_enabled"
)
values (
	'telemedicine:anonymous',
	'Telemedicine Anonymous Patient',
	'telemedicine-anonymous@qhealth.local',
	true,
	now(),
	now(),
	false
)
on conflict ("id") do nothing;

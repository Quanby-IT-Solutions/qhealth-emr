create table if not exists order_access_tokens (
	id uuid primary key default gen_random_uuid(),
	document_type text not null check (document_type in ('prescription', 'lab_order', 'imaging_order')),
	document_id uuid not null,
	patient_id uuid not null references patients(id) on delete cascade,
	facility_id uuid not null references facilities(id) on delete restrict,
	token_hash text not null,
	expires_at timestamp not null,
	revoked_at timestamp,
	created_by_staff_id uuid references staff_profiles(id) on delete set null,
	last_viewed_at timestamp,
	created_at timestamp not null default now()
);

create unique index if not exists order_access_tokens_hash_uniq
	on order_access_tokens(token_hash);
create index if not exists order_access_tokens_document_idx
	on order_access_tokens(document_type, document_id);
create index if not exists order_access_tokens_patient_id_idx
	on order_access_tokens(patient_id);
create index if not exists order_access_tokens_expires_at_idx
	on order_access_tokens(expires_at);

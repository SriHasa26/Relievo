-- ReliefRelay: all migrations in one file. Paste into Supabase Dashboard > SQL Editor > Run.
-- Safe to run once on an empty project. Source files: migrations/0001_schema.sql, migrations/0002_rls.sql

-- ReliefRelay schema. Supabase (Postgres) is the source of truth; Nexconn only carries chat.
-- Run in the Supabase SQL editor (or `supabase db push`), then run `npm run seed:supabase -w backend`.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text unique,                              -- copy of the Auth email, used for the demo role switcher
  role text not null check (role in ('citizen', 'volunteer', 'coordinator', 'ngo')),
  phone text,
  verified boolean not null default false,
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.volunteer_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  skills text[] not null default '{}',
  qualifications text[] not null default '{}',   -- e.g. 'medical', 'rescue_certified'
  availability text not null default 'available' check (availability in ('available', 'busy', 'offline')),
  capacity int not null default 1 check (capacity >= 1),
  lat double precision not null,
  lng double precision not null
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  verification_status text not null default 'pending' check (verification_status in ('verified', 'pending')),
  is_synthetic boolean not null default false
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id),
  original_text text not null,              -- never overwritten
  title text not null,
  category text not null check (category in ('medical', 'food', 'water', 'shelter', 'rescue', 'other')),
  urgency text not null check (urgency in ('low', 'medium', 'high', 'critical')),
  people_affected int,
  needs text[] not null default '{}',
  vulnerable_persons text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  address_text text not null default '',
  status text not null default 'submitted'
    check (status in ('submitted', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected')),
  reject_reason text,
  possible_duplicate_of uuid references public.incidents (id),
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.incident_ai_analysis (
  incident_id uuid primary key references public.incidents (id) on delete cascade,
  extracted_data jsonb not null,
  confidence numeric not null,
  model_version text not null,
  source text not null check (source in ('openrouter', 'gemini', 'fallback', 'mock'))  -- which provider answered
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  volunteer_id uuid not null references public.users (id),
  assigned_by uuid not null references public.users (id),
  status text not null check (status in ('approved', 'accepted', 'declined', 'reassigned', 'completed')),
  score_breakdown jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
-- At most one active (approved or accepted) assignment per incident.
create unique index assignments_one_active_per_incident
  on public.assignments (incident_id) where status in ('approved', 'accepted');

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  resource_type text not null check (resource_type in ('food', 'water', 'medicine', 'shelter')),
  name text not null,
  quantity int not null check (quantity >= 0),
  unit text not null,
  lat double precision not null,
  lng double precision not null
);

create table public.resource_allocations (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  resource_id uuid not null references public.resources (id),
  allocated_quantity int not null check (allocated_quantity > 0),
  allocated_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  actor_id uuid references public.users (id),   -- null = system
  action text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index incident_events_incident_idx on public.incident_events (incident_id, created_at);

create table public.incident_channels (
  incident_id uuid primary key references public.incidents (id) on delete cascade,
  nexconn_channel_id text not null unique
);

-- Minimal Row Level Security. The backend uses the service-role key (bypasses RLS) and enforces
-- the same rules in code; RLS protects any direct client access with the anon key.
--   citizens see their own incidents; volunteers see their own assignments; coordinators see all.

create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

alter table public.users enable row level security;
alter table public.volunteer_profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_ai_analysis enable row level security;
alter table public.assignments enable row level security;
alter table public.resources enable row level security;
alter table public.resource_allocations enable row level security;
alter table public.incident_events enable row level security;
alter table public.incident_channels enable row level security;

create policy users_read on public.users for select
  using (id = auth.uid() or public.current_role_name() = 'coordinator');

create policy volunteer_profiles_read on public.volunteer_profiles for select
  using (user_id = auth.uid() or public.current_role_name() = 'coordinator');
create policy volunteer_profiles_update_own on public.volunteer_profiles for update
  using (user_id = auth.uid());

create policy organisations_read on public.organisations for select using (auth.uid() is not null);

-- incidents: own (citizen), assigned (volunteer), all (coordinator)
create policy incidents_read on public.incidents for select using (
  reporter_id = auth.uid()
  or public.current_role_name() = 'coordinator'
  or exists (select 1 from public.assignments a
             where a.incident_id = incidents.id and a.volunteer_id = auth.uid()
               and a.status in ('approved', 'accepted', 'completed'))
);
create policy incidents_insert_own on public.incidents for insert with check (reporter_id = auth.uid());
create policy incidents_coordinator_update on public.incidents for update
  using (public.current_role_name() = 'coordinator');

-- Tables hanging off an incident are readable exactly when the incident is readable.
create policy analysis_read on public.incident_ai_analysis for select
  using (exists (select 1 from public.incidents i where i.id = incident_id));
create policy events_read on public.incident_events for select
  using (exists (select 1 from public.incidents i where i.id = incident_id));
create policy channels_read on public.incident_channels for select
  using (public.current_role_name() = 'coordinator'
         or exists (select 1 from public.assignments a
                    where a.incident_id = incident_channels.incident_id
                      and a.volunteer_id = auth.uid() and a.status in ('approved', 'accepted')));

create policy assignments_read on public.assignments for select
  using (volunteer_id = auth.uid() or public.current_role_name() = 'coordinator');

create policy resources_read on public.resources for select using (auth.uid() is not null);
create policy allocations_read on public.resource_allocations for select
  using (public.current_role_name() in ('coordinator', 'ngo'));

-- No insert/update policies on events, assignments, channels, allocations: only the backend (service role) writes them.

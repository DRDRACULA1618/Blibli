-- BliBli — schéma de départ pour Supabase/PostgreSQL.
-- À relire et adapter avant un déploiement public.

create extension if not exists pgcrypto;

create type public.contribution_type as enum (
  'vendor_created',
  'vendor_updated',
  'presence_confirmation',
  'absence_report',
  'problem_report',
  'phone_proposed'
);

create type public.moderation_status as enum (
  'pending', 'accepted', 'rejected', 'hidden', 'archived'
);

create type public.contact_status as enum (
  'proposed', 'verified', 'rejected', 'removed'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudonym text not null check (char_length(pseudonym) between 2 and 40),
  avatar_url text,
  trust_score integer not null default 0,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_locations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  seller_name text,
  area text,
  landmark text,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  indicative_price integer check (indicative_price is null or indicative_price >= 0),
  usual_period text,
  photo_url text,
  last_seen_at timestamptz not null default now(),
  confirmations_count integer not null default 1,
  moderation_status public.moderation_status not null default 'pending',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index vendor_locations_geo_idx on public.vendor_locations (latitude, longitude);
create index vendor_locations_last_seen_idx on public.vendor_locations (last_seen_at desc);
create index vendor_locations_status_idx on public.vendor_locations (moderation_status);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  vendor_id uuid references public.vendor_locations(id) on delete cascade,
  contribution_type public.contribution_type not null,
  payload jsonb not null default '{}'::jsonb,
  moderation_status public.moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create index contributions_user_idx on public.contributions (user_id, created_at desc);
create index contributions_vendor_idx on public.contributions (vendor_id, created_at desc);

create table public.presence_confirmations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_locations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index presence_vendor_idx on public.presence_confirmations (vendor_id, observed_at desc);

-- Les numéros proposés ne doivent jamais être exposés par une requête publique.
-- En production, remplacez phone_private par un stockage chiffré ou un Vault.
create table public.seller_contacts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_locations(id) on delete cascade,
  phone_private text not null,
  public_phone text,
  consent_declared boolean not null default false,
  contact_status public.contact_status not null default 'proposed',
  proposed_by uuid references public.profiles(id) on delete set null,
  proposed_at timestamptz not null default now(),
  verified_at timestamptz,
  removed_at timestamptz
);

create index seller_contacts_vendor_idx on public.seller_contacts (vendor_id, contact_status);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_locations(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  moderation_status public.moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

-- Création automatique du profil après inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, pseudonym)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'pseudonym', ''), 'MembreBliBli')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Confirmation atomique d'une présence.
create or replace function public.confirm_vendor_presence(p_vendor_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  insert into public.presence_confirmations (vendor_id, user_id)
  values (p_vendor_id, auth.uid());

  update public.vendor_locations
  set last_seen_at = now(),
      confirmations_count = confirmations_count + 1,
      updated_at = now()
  where id = p_vendor_id;

  insert into public.contributions (
    user_id, vendor_id, contribution_type, moderation_status
  ) values (
    auth.uid(), p_vendor_id, 'presence_confirmation', 'accepted'
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.vendor_locations enable row level security;
alter table public.contributions enable row level security;
alter table public.presence_confirmations enable row level security;
alter table public.seller_contacts enable row level security;
alter table public.moderation_reports enable row level security;

create policy "Profils publics limités en lecture"
on public.profiles for select
using (suspended_at is null);

create policy "Chaque utilisateur modifie son profil"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Points visibles publiquement"
on public.vendor_locations for select
using (moderation_status in ('pending', 'accepted') and archived_at is null);

create policy "Utilisateur connecté crée un point"
on public.vendor_locations for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Utilisateur lit ses contributions"
on public.contributions for select
to authenticated
using (user_id = auth.uid());

create policy "Utilisateur lit ses confirmations"
on public.presence_confirmations for select
to authenticated
using (user_id = auth.uid());

create policy "Utilisateur crée une confirmation"
on public.presence_confirmations for insert
to authenticated
with check (user_id = auth.uid());

create policy "Utilisateur propose un contact"
on public.seller_contacts for insert
to authenticated
with check (proposed_by = auth.uid() and consent_declared = true);

create policy "Utilisateur lit uniquement ses contacts proposés"
on public.seller_contacts for select
to authenticated
using (proposed_by = auth.uid());

create policy "Utilisateur crée un signalement"
on public.moderation_reports for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "Utilisateur lit ses signalements"
on public.moderation_reports for select
to authenticated
using (reporter_id = auth.uid());

grant execute on function public.confirm_vendor_presence(uuid) to authenticated;

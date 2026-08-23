-- SawitProNesia v11.1 — Production hardening
-- Run once in Supabase SQL Editor after the v10.7 role migration.

create table if not exists public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid,
  action text not null check (action in ('ASSIGN_ACCESS','REVOKE_ACCESS')),
  role text,
  estate_id uuid references public.estates(id) on delete set null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.access_audit_logs enable row level security;

drop policy if exists access_audit_owner_select on public.access_audit_logs;
create policy access_audit_owner_select on public.access_audit_logs
for select to authenticated
using (
  exists(select 1 from public.estates e where e.owner_id = auth.uid())
);

-- No direct INSERT/UPDATE/DELETE policy: records are written only by SECURITY DEFINER access RPCs.

create or replace function public.spn_assign_member_by_email(p_email text, p_role text, p_estate_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_target uuid;
  v_workspace uuid;
  v_existing uuid;
begin
  if not exists(select 1 from public.estates e where e.owner_id=auth.uid()) then raise exception 'Hanya Owner kebun yang dapat mengelola akses'; end if;
  if p_role not in ('admin','mandor','pemanen','viewer') then raise exception 'Role tidak valid'; end if;
  if p_role = 'pemanen' and p_estate_id is null then raise exception 'Pemanen wajib memiliki kebun tugas'; end if;
  if p_estate_id is not null and not exists(select 1 from public.estates e where e.id=p_estate_id and e.owner_id=auth.uid()) then raise exception 'Kebun bukan milik Owner ini'; end if;

  select u.id into v_target from auth.users u where lower(u.email)=lower(trim(p_email)) limit 1;
  if v_target is null then raise exception 'Email belum terdaftar di Supabase Authentication'; end if;
  if v_target = auth.uid() then raise exception 'Akses Owner sendiri tidak dapat diubah dari menu ini'; end if;

  select wm.workspace_id into v_workspace
  from public.workspace_members wm
  where wm.user_id=auth.uid() and wm.role='owner' and wm.status='active'
  limit 1;

  if v_workspace is null then
    insert into public.workspaces(name,created_by) values('SawitProNesia',auth.uid()) returning id into v_workspace;
    insert into public.workspace_members(workspace_id,user_id,email,role,status)
    values(v_workspace,auth.uid(),coalesce((select email from auth.users where id=auth.uid()),''),'owner','active');
  end if;

  select wm.id into v_existing from public.workspace_members wm where wm.workspace_id=v_workspace and wm.user_id=v_target limit 1;
  if v_existing is null then
    insert into public.workspace_members(workspace_id,user_id,email,role,estate_id,status)
    values(v_workspace,v_target,lower(trim(p_email)),p_role,p_estate_id,'active');
  else
    update public.workspace_members set role=p_role, estate_id=p_estate_id, status='active', email=lower(trim(p_email)) where id=v_existing;
  end if;

  insert into public.access_audit_logs(actor_user_id,target_user_id,action,role,estate_id,detail)
  values(auth.uid(),v_target,'ASSIGN_ACCESS',p_role,p_estate_id,lower(trim(p_email)));
  return 'ok';
end;
$$;

grant execute on function public.spn_assign_member_by_email(text,text,uuid) to authenticated;

create or replace function public.spn_revoke_member_access(p_member_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace uuid;
  v_target uuid;
  v_role text;
  v_estate uuid;
  v_email text;
begin
  select me.workspace_id into v_workspace
  from public.workspace_members me
  where me.user_id=auth.uid() and me.role='owner' and me.status='active'
  limit 1;
  if v_workspace is null then raise exception 'Hanya Owner yang dapat mencabut akses'; end if;

  select wm.user_id, wm.role, wm.estate_id, wm.email
    into v_target, v_role, v_estate, v_email
  from public.workspace_members wm
  where wm.id=p_member_id and wm.workspace_id=v_workspace and wm.status='active'
  limit 1;

  if v_target is null then raise exception 'Pengguna tidak ditemukan'; end if;
  if v_target=auth.uid() or v_role='owner' then raise exception 'Akses Owner tidak dapat dicabut'; end if;

  update public.workspace_members set status='inactive' where id=p_member_id;
  insert into public.access_audit_logs(actor_user_id,target_user_id,action,role,estate_id,detail)
  values(auth.uid(),v_target,'REVOKE_ACCESS',v_role,v_estate,v_email);
  return 'ok';
end;
$$;

grant execute on function public.spn_revoke_member_access(uuid) to authenticated;

-- SawitProNesia v10.7 — Role Access & Pemanen Mode
-- Apply once in Supabase SQL Editor before testing a Pemanen account.

create or replace function public.spn_current_access()
returns table(role text, estate_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select wm.role, wm.estate_id
  from public.workspace_members wm
  where wm.user_id = auth.uid() and wm.status = 'active'
  order by case wm.role when 'owner' then 1 when 'admin' then 2 when 'mandor' then 3 when 'pemanen' then 4 else 5 end
  limit 1;

  if not found and exists(select 1 from public.estates e where e.owner_id = auth.uid()) then
    return query select 'owner'::text, null::uuid;
  end if;
end;
$$;

grant execute on function public.spn_current_access() to authenticated;

create or replace function public.spn_has_estate_role(p_estate_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.estates e
    where e.id = p_estate_id and e.owner_id = auth.uid()
  ) or exists(
    select 1 from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.estate_id = p_estate_id
      and wm.role = any(p_roles)
  );
$$;

grant execute on function public.spn_has_estate_role(uuid, text[]) to authenticated;

-- Read-only master access for assigned users. Existing owner policies remain intact.
drop policy if exists estates_select_assigned_member on public.estates;
create policy estates_select_assigned_member on public.estates
for select to authenticated
using (public.spn_has_estate_role(id, array['admin','mandor','pemanen','viewer']::text[]));

drop policy if exists blocks_select_assigned_member on public.blocks;
create policy blocks_select_assigned_member on public.blocks
for select to authenticated
using (public.spn_has_estate_role(estate_id, array['admin','mandor','pemanen','viewer']::text[]));

-- Pemanen may only insert DIRECT harvest rows into the assigned estate.
-- They cannot UPDATE or DELETE because no matching policy is granted.
drop policy if exists harvests_insert_assigned_operator on public.harvests;
create policy harvests_insert_assigned_operator on public.harvests
for insert to authenticated
with check (
  created_by = auth.uid()
  and source = 'DIRECT'
  and plan_id is null
  and public.spn_has_estate_role(estate_id, array['admin','mandor','pemanen']::text[])
  and exists(select 1 from public.blocks b where b.id = block_id and b.estate_id = harvests.estate_id)
);

-- Pemanen can only read receipts they created themselves; owner policies still allow full history.
drop policy if exists harvests_select_own_pemanen_receipt on public.harvests;
create policy harvests_select_own_pemanen_receipt on public.harvests
for select to authenticated
using (
  created_by = auth.uid()
  and public.spn_has_estate_role(estate_id, array['pemanen']::text[])
);

-- Owner utility: list members without exposing auth.users.
create or replace function public.spn_list_workspace_members()
returns table(id uuid, email text, role text, estate_id uuid, status text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select wm.id, wm.email, wm.role, wm.estate_id, wm.status
  from public.workspace_members wm
  where wm.status = 'active'
    and exists(
      select 1 from public.workspace_members me
      where me.workspace_id = wm.workspace_id and me.user_id = auth.uid() and me.role = 'owner' and me.status = 'active'
    )
  order by wm.created_at;
$$;

grant execute on function public.spn_list_workspace_members() to authenticated;

-- Owner utility: assign an EXISTING Supabase Auth user by email.
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
  if p_estate_id is not null and not exists(select 1 from public.estates e where e.id=p_estate_id and e.owner_id=auth.uid()) then
    raise exception 'Kebun bukan milik Owner ini';
  end if;

  select u.id into v_target from auth.users u where lower(u.email)=lower(trim(p_email)) limit 1;
  if v_target is null then raise exception 'Email belum terdaftar di Supabase Authentication'; end if;

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
  return 'ok';
end;
$$;

grant execute on function public.spn_assign_member_by_email(text,text,uuid) to authenticated;

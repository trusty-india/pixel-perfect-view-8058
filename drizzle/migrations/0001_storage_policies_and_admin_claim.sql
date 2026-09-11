create policy "media auth read" on storage.objects for select to authenticated using (bucket_id = 'public-media');
create policy "media auth upload" on storage.objects for insert to authenticated with check (bucket_id = 'public-media' and owner = auth.uid());
create policy "media owner update" on storage.objects for update to authenticated using (bucket_id = 'public-media' and (owner = auth.uid() or public.is_admin()));
create policy "media owner delete" on storage.objects for delete to authenticated using (bucket_id = 'public-media' and (owner = auth.uid() or public.is_admin()));

create or replace function public.claim_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare has_any boolean;
begin
  if auth.uid() is null then return false; end if;
  select exists(select 1 from public.user_roles where role = 'admin') into has_any;
  if has_any then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin') on conflict do nothing;
  return true;
end; $$;
grant execute on function public.claim_admin() to authenticated;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;
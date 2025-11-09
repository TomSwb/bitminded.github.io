-- Migration: Allow public select on beta products

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Users can view beta products'
  ) then
    create policy "Users can view beta products"
      on products
      for select
      using (status = 'beta');
  end if;
end
$$;


-- Complemento do baseline: o que `supabase db dump` NÃO leva.
--
-- O dump cobre o schema `public` — tabelas, funções, RLS, triggers. Fica de
-- fora tudo que mora em schema gerenciado pela Supabase, e três coisas aí são
-- essenciais pra aplicação funcionar:
--
--   1. O trigger em `auth.users`. Sem ele o cadastro cria o usuário no Auth e
--      NUNCA cria a linha em `profiles`. O app inteiro assume que esse perfil
--      existe — é a falha mais silenciosa possível num projeto novo.
--   2. Os buckets de storage. São linhas em `storage.buckets`, ou seja dados
--      num schema gerenciado; nenhum dump de schema traz.
--   3. As policies de `storage.objects`. Sem elas, upload de avatar, foto de
--      produto e nota de impressora falham com erro de permissão.
--
-- Rodar DEPOIS de 01_schema.sql. É idempotente: pode rodar de novo sem estrago.

-- ---------------------------------------------------------
-- 1. Buckets
-- ---------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('avatars',           'avatars',           true),
  ('bridge-releases',   'bridge-releases',   true),
  ('printer-invoices',  'printer-invoices',  false),
  ('printer-snapshots', 'printer-snapshots', true),
  ('products',          'products',          true)
on conflict (id) do update set public = excluded.public;

-- ---------------------------------------------------------
-- 2. Policies de storage.objects
--
-- O padrão em todos os buckets privados por usuário é o mesmo: a primeira
-- pasta do caminho é o id do dono, então `storage.foldername(name)[1]` tem que
-- bater com `auth.uid()`.
-- ---------------------------------------------------------

-- avatars: qualquer um lê (foto aparece na loja pública), só o dono escreve.
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert with check (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

-- bridge-releases: só leitura pública. A escrita é feita à mão pelo painel.
drop policy if exists bridge_releases_public_read on storage.objects;
create policy bridge_releases_public_read on storage.objects
  for select using (bucket_id = 'bridge-releases');

-- printer-invoices: nota fiscal de equipamento. Privado ponta a ponta — nem a
-- leitura é pública, diferente dos outros.
drop policy if exists printer_invoices_owner_read on storage.objects;
create policy printer_invoices_owner_read on storage.objects
  for select using (bucket_id = 'printer-invoices' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists printer_invoices_owner_write on storage.objects;
create policy printer_invoices_owner_write on storage.objects
  for insert with check (bucket_id = 'printer-invoices' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists printer_invoices_owner_update on storage.objects;
create policy printer_invoices_owner_update on storage.objects
  for update using (bucket_id = 'printer-invoices' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists printer_invoices_owner_delete on storage.objects;
create policy printer_invoices_owner_delete on storage.objects
  for delete using (bucket_id = 'printer-invoices' and (auth.uid())::text = (storage.foldername(name))[1]);

-- printer-snapshots: imagem da câmera, lida pelo dashboard sem sessão.
drop policy if exists printer_snapshots_public_read on storage.objects;
create policy printer_snapshots_public_read on storage.objects
  for select using (bucket_id = 'printer-snapshots');

-- products: foto de produto, aparece na loja pública.
drop policy if exists products_images_public_read on storage.objects;
create policy products_images_public_read on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists products_images_owner_insert on storage.objects;
create policy products_images_owner_insert on storage.objects
  for insert with check (bucket_id = 'products' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists products_images_owner_update on storage.objects;
create policy products_images_owner_update on storage.objects
  for update using (bucket_id = 'products' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists products_images_owner_delete on storage.objects;
create policy products_images_owner_delete on storage.objects
  for delete using (bucket_id = 'products' and (auth.uid())::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------
-- 3. Trigger de criação de perfil
--
-- A função public.handle_new_user() vem no 01_schema.sql; o que falta é
-- pendurá-la em auth.users. Esta é a peça que, faltando, deixa o projeto
-- parecendo saudável até o primeiro cadastro.
-- ---------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- integration_set_credential tentava sempre CRIAR um novo secret no Vault
-- quando p_secret_id vinha null (conexão nova / reconexão sem credential_secret_id
-- salvo em integrations). Se uma tentativa anterior já tivesse criado um secret
-- com esse mesmo nome (ex: mercado_pago:<user_id>) mas falhado antes de salvar
-- o id de volta em integrations, a próxima tentativa batia de frente com a
-- unique constraint "secrets_name_idx" (duplicate key value).
--
-- Agora, antes de criar, verifica se já existe um secret órfão com esse nome
-- e reaproveita ele (update) em vez de tentar inserir de novo.
create or replace function public.integration_set_credential(
  p_secret_id uuid,
  p_new_value text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing_id uuid;
begin
  if p_secret_id is not null then
    perform vault.update_secret(p_secret_id, p_new_value, p_name);
    return p_secret_id;
  end if;

  select id into v_existing_id from vault.secrets where name = p_name limit 1;
  if v_existing_id is not null then
    perform vault.update_secret(v_existing_id, p_new_value, p_name);
    return v_existing_id;
  end if;

  v_id := vault.create_secret(p_new_value, p_name);
  return v_id;
end;
$$;

-- Security: revoke execute permissions from public roles; only service_role should call this
revoke execute on function public.integration_set_credential(uuid, text, text) from public, authenticated;
grant execute on function public.integration_set_credential(uuid, text, text) to service_role;

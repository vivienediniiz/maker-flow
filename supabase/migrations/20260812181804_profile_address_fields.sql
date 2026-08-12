alter table public.profiles
  add column if not exists cep text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists state text,
  add column if not exists complement text;

comment on column public.profiles.cep is 'CEP do estúdio, usado como origem padrão no cálculo de frete';
comment on column public.profiles.street is 'Rua/logradouro do estúdio';
comment on column public.profiles.street_number is 'Número do endereço do estúdio';
comment on column public.profiles.state is 'UF do estúdio';
comment on column public.profiles.complement is 'Complemento do endereço do estúdio';

update public.profiles
set address = concat_ws(', ', street, street_number, complement, state)
where address is null
  and (coalesce(street, '') <> '' or coalesce(street_number, '') <> '');

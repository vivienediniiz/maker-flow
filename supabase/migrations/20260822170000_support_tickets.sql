-- Sinaliza quem e a administradora do StudioMaker -- marcado manualmente
-- via SQL, nunca checado por e-mail fixo no codigo (mais seguro/escalavel).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Le profiles.is_admin sem depender da RLS de profiles (evita qualquer
-- sutileza de subquery em policy -- roda com privilegio do owner, sempre
-- enxerga a linha certa independente de quem esta chamando).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy support_tickets_select_own on public.support_tickets
  for select using (auth.uid() = user_id);
create policy support_tickets_insert_own on public.support_tickets
  for insert with check (auth.uid() = user_id);
create policy support_tickets_update_own on public.support_tickets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy support_tickets_admin_all on public.support_tickets
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'admin')),
  sender_id uuid references auth.users(id),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.support_ticket_messages enable row level security;

-- SELECT: cliente ve todas as mensagens (inclusive respostas do admin) do
-- proprio ticket.
create policy support_ticket_messages_select_own on public.support_ticket_messages
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- INSERT: cliente so insere como "customer", em nome dele mesmo, no proprio
-- ticket -- impede se passar por "admin" mesmo se o front tivesse um bug.
-- Sem policy de UPDATE/DELETE pro cliente: historico imutavel do lado dele.
create policy support_ticket_messages_insert_own on public.support_ticket_messages
  for insert with check (
    sender_type = 'customer'
    and sender_id = auth.uid()
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

create policy support_ticket_messages_admin_all on public.support_ticket_messages
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Toda mensagem nova "toca" o updated_at do ticket pai -- sinal minimo
-- viavel de atividade recente, usado pelo painel admin pra priorizar.
create or replace function public.touch_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists support_ticket_messages_touch on public.support_ticket_messages;
create trigger support_ticket_messages_touch
  after insert on public.support_ticket_messages
  for each row execute function public.touch_support_ticket();

-- View so pro painel admin: junta nome/e-mail do cliente e a ultima
-- mensagem (quem mandou + quando), pra listar/ordenar por "aguardando
-- resposta ha mais tempo" sem N+1 query. RLS das tabelas de baixo continua
-- valendo -- um nao-admin so enxerga os proprios tickets nessa view tambem.
create or replace view public.support_tickets_admin_view as
select
  t.*,
  p.full_name as customer_name,
  p.email as customer_email,
  m.sender_type as last_sender_type,
  m.created_at as last_message_at
from public.support_tickets t
join public.profiles p on p.id = t.user_id
left join lateral (
  select sender_type, created_at
  from public.support_ticket_messages
  where ticket_id = t.id
  order by created_at desc
  limit 1
) m on true;

grant select on public.support_tickets_admin_view to authenticated;

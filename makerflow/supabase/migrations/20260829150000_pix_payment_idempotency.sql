-- Idempotência do webhook de pagamento Pix.
--
-- O Mercado Pago reenvia o aviso do mesmo pagamento (retry, ou o mesmo evento
-- chegando por dois canais). Sem marcar qual pagamento já foi processado, cada
-- reenvio de um Pix aprovado somava outro período inteiro em `paid_until` —
-- assinatura de graça, sem ninguém perceber.
--
-- `last_pix_payment_id` guarda o id do último pagamento Pix já creditado. O
-- webhook compara antes de escrever e ignora repetição.

alter table public.profiles
  add column if not exists last_pix_payment_id text;

comment on column public.profiles.last_pix_payment_id is
  'Id do último pagamento Pix já creditado em paid_until. Trava de idempotência do webhook do Mercado Pago — não é histórico, só a última marca.';

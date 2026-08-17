# StudioMaker

SaaS de gestão, precificação e automação para makers e estúdios de impressão 3D.
Next.js 14 (App Router) · React · TypeScript · Tailwind CSS · Supabase · Mercado Pago.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves Supabase/Mercado Pago
```

1. Crie um projeto no [Supabase](https://supabase.com).
2. Rode `supabase/schema.sql` no SQL Editor do seu projeto (cria as 7 tabelas com RLS + trigger de auto-provisionamento de `profiles`/`settings` no signup).
3. Preencha `.env.local` com as chaves do Supabase e do Mercado Pago.
4. `npm run dev` → http://localhost:3000

## Estrutura

```
app/
  (auth)/login, signup, reset-password     — fluxos de autenticação via @supabase/ssr
  dashboard/
    layout.tsx                              — shell com Sidebar fixa
    page.tsx                                — A. Dashboard Principal
    calculator/                             — B. Calculadora Inteligente de Orçamentos
    orders/                                 — C. Gestão de Pedidos
    products/                               — D. Produtos e Catálogo
    inventory/                              — E. Estoque 3D & Vendas
    shipping/                               — F. Cálculo de Frete
    insights/                               — G. Insights & BI
    settings/                               — H. Configurações Globais
    registrations/                          — I. Cadastros e Compras
  api/
    webhooks/mercadopago/route.ts           — sincroniza assinaturas recorrentes
    v1/printers/telemetry/route.ts          — endpoint IoT para impressoras/print-farms
components/
  ui/            — GlassCard, NeonButton, Modal, Toggle, SegmentedControl, KpiCard, StatusBadge...
  dashboard/     — Sidebar, Topbar, PrinterCard, NewOrderModal, NewClientModal, QuickSaleModal, FilamentTank
  charts/        — FinancialChart (recharts)
lib/
  supabase/      — client.ts (browser) e server.ts (SSR, cookies)
  types.ts       — tipos TypeScript espelhando o schema SQL
supabase/
  schema.sql     — as 7 tabelas + RLS + trigger de auto-provisionamento
middleware.ts    — protege /dashboard/* redirecionando usuários não autenticados
```

## Design system

Tokens implementados em `tailwind.config.ts` e `app/globals.css`, exatamente como especificado:
background `#0B0914`, gradiente neon `#E86333 → #FF4EDF → #AA17DB`, cores de status neon,
superfícies de vidro (`blur(20px)`, borda `rgba(255,255,255,0.08)`), tipografia Woodland/Montserrat.

> **Fonte `PP Woodland`**: é uma fonte comercial licenciada — o projeto referencia
> `font-display` no Tailwind, mas você precisa adicionar o arquivo da fonte (via `next/font/local`
> ou `@font-face`) com sua própria licença. Por padrão cai para Georgia/serif.

## O que está com dados mock

Para as telas funcionarem imediatamente sem um banco populado, os componentes de página
(`orders`, `products`, `inventory`, `insights`, `registrations`) usam arrays mock no topo do
arquivo. Substitua por queries Supabase (`createClient()` de `lib/supabase/server.ts` em
Server Components) quando conectar ao banco real — os tipos em `lib/types.ts` já espelham
as colunas do `schema.sql`.

## Próximos passos sugeridos

- Geração real de PDF de orçamento (ex: `@react-pdf/renderer` ou Puppeteer em uma API route).
- Integração real do Mercado Pago Checkout Pro para o botão "Gerar Link de Cobrança".
- Integração real da API do Melhor Envio em `/dashboard/shipping`.
- Camada de dados: Server Actions ou Route Handlers para cada CRUD (printers, filaments, quotes, orders, products).
- Realtime: `supabase.channel()` para refletir telemetria de impressoras ao vivo no Dashboard.

## Planos e pagamentos (Mercado Pago)

3 níveis pagos + Free, definidos em `lib/plans.ts` (fonte única de verdade — mude preços e features ali):

| Plano   | Mensal | Anual (equiv./mês) | Impressoras | Filiais    |
|---------|--------|---------------------|-------------|------------|
| Free    | —      | —                   | 1           | 1          |
| Starter | R$29   | R$24                | 2           | 1          |
| Pro     | R$79   | R$65                | 8           | 2          |
| Studio  | R$149  | R$124               | ilimitado   | ilimitado  |

**Fluxo de assinatura:**
1. `/pricing` → usuário escolhe plano + ciclo → `POST /api/mercadopago/create-preapproval`
2. Essa rota cria uma *preapproval* (assinatura recorrente) no Mercado Pago, codificando
   `userId|planId|cycle` na `external_reference`, e retorna o `init_point` (URL de checkout)
3. Usuário paga no checkout do Mercado Pago
4. Mercado Pago chama `/api/webhooks/mercadopago`, que decodifica a `external_reference` e
   atualiza `profiles.subscription_tier`, `billing_cycle` e `subscription_status` via service role

**Credenciais de produção**: eu não consigo gerar isso automaticamente — exige verificação da
sua conta/CNPJ no Mercado Pago. Gere em
https://www.mercadopago.com.br/developers/panel/app e cole em `.env.local`
(ver `.env.example`). Depois, cadastre a URL do webhook
(`https://SEU_DOMINIO/api/webhooks/mercadopago`) no painel da aplicação, evento
"Assinaturas e Planos".

> Enquanto o domínio de produção não existe, use uma URL pública temporária (ex: `ngrok`)
> para testar o webhook localmente — o Mercado Pago não consegue chamar `localhost`.

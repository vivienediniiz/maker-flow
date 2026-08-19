# StudioMaker — Contexto do Projeto

SaaS de gestão para makers/estúdios de impressão 3D. Next.js 14 (App Router) + TypeScript + Tailwind + Supabase + Mercado Pago.

## Stack e infraestrutura

- **Deploy:** Netlify, auto-deploy a partir do repositório GitHub `vivienediniiz/maker-flow` (com hífen — existe também um `makerflow` sem hífen, mais antigo e **não usado**, cuidado pra não confundir)
- **Site:** maker-flow.netlify.app
- **Supabase:** projeto `makerflow`, ID `dgcdltcpvnultwduypcu`, região `sa-east-1` (São Paulo)
- **Mercado Pago — DOIS apps separados, não confundir:**
  - **"Makerflow3d"**: `MERCADOPAGO_ACCESS_TOKEN`/`MERCADOPAGO_PUBLIC_KEY`, cobra a assinatura do StudioMaker em si (cartão automático + Pix manual). Webhook: `/api/webhooks/mercadopago`. Não mexer nisso pra vendas.
  - **"MakerFlow Vendas"**: `MERCADO_PAGO_VENDAS_CLIENT_ID`/`_CLIENT_SECRET`/`_WEBHOOK_SECRET`, app OAuth separado que cada maker conecta pra receber notificação das próprias vendas (ver "Integrações" abaixo). Webhook: `/api/webhooks/mercado-pago` (com hífen entre "mercado" e "pago" — cuidado, é bem parecido com a URL do app de assinatura).
- **`bridge/`**: script Python separado (fora do app Next.js) que roda no computador do maker, na rede local da impressora Bambu Lab, e manda telemetria + snapshot de câmera pro StudioMaker via webhook. Tem versão CLI (`bridge.py`, dev) e GUI empacotada em `.exe` via PyInstaller (`bridge_gui.py`, cliente final — hospedado no bucket `bridge-releases` do Supabase Storage). Ver `bridge/README.md`.

## Design system

- Fundo `#0B0914`, gradiente neon `#E86333 → #FF4EDF → #AA17DB`
- Fontes: **Exo 2** pra títulos (`font-display`), **Chakra Petch** pra números/valores (`font-numeric`), **Montserrat** pro resto (`font-sans`)
- Componentes base em `components/ui/`: GlassCard, NeonButton, Modal, Toggle, SegmentedControl, StatusBadge, PasswordInput

## Estrutura do banco (Supabase)

Tabelas principais: `profiles`, `printers`, `filaments`, `filament_movements`, `quotes`, `orders` (não usada ativamente — `quotes` virou a fonte única de verdade pro fluxo de vendas), `products`, `settings`, `clients`, `categories`, `sales`, `branches`, `supplies`, `extra_purchases`, `integrations`.

`filaments`: cada linha é uma combinação única de `brand`+`material`+`color_hex` — reabastecer o mesmo filamento soma em `remaining_weight_g`/`weight_total_g` na linha existente, nunca cria linha nova (ver tela Filamentos abaixo). `low_stock_threshold_g` (nullable) sobrepõe o padrão do app (150g ou 15% do total, o que disparar primeiro) — lógica centralizada em `lib/filaments.ts` (`isFilamentLow`/`filamentFillPercent`).

`filament_movements`: histórico de entrada/saída, `quantity_g` positivo = entrada, negativo = saída. `movement_type` é `purchase` (via "Registrar Compra"), `sale_consumption` (baixa automática ao criar uma Venda Manual com filamento vinculado, `related_quote_id` preenchido) ou `manual_adjustment` (reservado, sem UI ainda).

`supply_movements` (mesmo padrão de `filament_movements`, mas pra `supplies`): `quantity` positivo = entrada, negativo = saída, `unit_cost_at_time` guarda o custo por unidade vigente naquele movimento (histórico de preço mesmo depois que `supplies.cost_per_unit` é sobrescrito por uma compra mais recente — nunca faz média ponderada). Mesmos três `movement_type`.

`quotes` é o coração do sistema de Vendas (tela antes chamada "Pedidos"): tem `status` (`sent`/`paid`/`in_production`/`shipped`/`expired`/`cancelled`), `order_number` (sequencial automático via trigger), `channel` (canal de venda escolhido manualmente), `source` (`mercado_pago`/`mercado_livre`/`shopee`/`tiktok_shop`/`manual` — origem do *registro*, diferente de `channel`), `external_order_id` (idempotência de webhook, unique junto com `user_id`+`source`), `buyer_name`, `platform_fee`, `cost_amount`, `net_amount` (coluna gerada), `payment_method`, `shipping_cost`, `destination_cep`, `product_id` (vínculo opcional com um produto do catálogo).

`printers` guarda telemetria (`current_*`, `last_telemetry_at`) e câmera (`last_snapshot_at`) recebidas via `/api/v1/printers/telemetry` e `/api/v1/printers/snapshot`, autenticado por `api_key_webhook` (gerado automaticamente por impressora).

`integrations` guarda a conexão do maker com plataformas de venda (Mercado Pago/Mercado Livre/Shopee/TikTok Shop). Credenciais **nunca** ficam em texto puro — vão pro Supabase Vault via funções `security definer` (`public.integration_set_credential`/`_get_credential`/`_delete_credential`, só acessíveis por `service_role`). `integrations.credential_secret_id` só guarda a referência.

`products.calc_inputs` (jsonb) guarda o snapshot completo dos parâmetros da Calculadora quando um produto é criado por lá — permite recarregar o cálculo depois.

Buckets de Storage: `avatars` (logo do estúdio), `products` (fotos de produto), `bridge-releases` (público, `.exe` do bridge), `printer-snapshots` (público, foto mais recente da câmera de cada impressora).

## Funcionalidades já construídas

- Auth completo (login/signup/logout/troca de senha), reverse trial de 14 dias (ver seção Planos abaixo). Tela de **login** tem visual próprio (fundo aurora animado, painel "liquid glass", headline com efeito de digitação, login social com Google) e por isso vive num route group dedicado `app/(login)/login/` — separado do `app/(auth)/` que ainda serve Signup/Reset (layout de duas colunas simples). Login social usa `supabase.auth.signInWithOAuth` + callback em `app/auth/callback/route.ts`; provider Google já habilitado e funcionando em Supabase → Authentication → Providers. Facebook foi removido (`components/auth/SocialAuthButtons.tsx` ficou com a estrutura em array, fácil reativar/adicionar outro provider depois se precisar) — páginas públicas `/privacy-policy` e `/data-deletion` continuam no ar (a segunda foi criada especificamente pro cadastro do Facebook Login, mas não faz mal manter).
- Dashboard, Calculadora (com seletor de produto existente, faixas de preço, marketplace vindo de Configurações)
- Clientes (lista em tabela, busca)
- Produtos (lista em tabela, foto, overlay de detalhe)
- Vendas (ex-"Pedidos": grid de cards com badge de origem, Bruto/Custos/Líquido, filtro de status + canal de origem, overlay com barra de status **só avança** exceto pelo botão "Cancelar Venda" que joga pro status `cancelled` a qualquer momento, doc. de envio em PDF). Modal "Nova Venda Manual" (`NewSaleModal.tsx`) tem seção opcional "Filamento(s) Utilizados" (só na criação, não na edição) — ao salvar, desconta `remaining_weight_g` de cada filamento selecionado e cria o `filament_movements` de `sale_consumption`; se a quantidade informada passar do disponível só avisa, não bloqueia a venda.
- Estoque 3D (`/dashboard/inventory`, produtos físicos prontos/pronta-entrega — **não** confundir com Filamentos, são telas e tabelas diferentes que coexistem de propósito): Adicionar Estoque + venda com histórico real
- Filamentos (`/dashboard/filaments`, aba própria no menu, não mais dentro de Cadastros): prateleira visual em cards (ícone de carretel SVG com anel de nível + cor real via `color_hex`, badge "Estoque baixo"), "Novo Filamento" (bloqueia duplicar combinação já existente), "Registrar Compra" (abastece uma combinação existente, soma ao estoque, loga em `filament_movements`) e "Histórico de Movimentações" filtrável por filamento/tipo/período
- Cadastros (Impressoras, Insumos, Compras Extras, Cupons, Filiais, Categorias — todas com CRUD real). Insumos (`SuppliesRegistrationTab.tsx`) tem o mesmo padrão de compra de Filamentos: Categoria é combobox pré-carregado (Embalagem/Acabamento/Adesivos e Fixação/Limpeza e Manutenção/Eletrônicos e Acessórios/Apresentação e Marketing) + "Outro" pra digitação manual; "Registrar Compra" (header e por linha) calcula `cost_per_unit = valor total ÷ quantidade comprada` e **sobrescreve** o custo atual (nunca faz média), soma ao `stock_quantity` e loga em `supply_movements`; "Histórico de Movimentações" filtrável por insumo/tipo/período embaixo da tabela. Venda Manual (`NewSaleModal.tsx`) tem seção opcional "Insumo(s) Utilizados" espelhando "Filamento(s) Utilizados" — mesma regra de só descontar na criação (não na edição), mesmo aviso não-bloqueante se passar do estoque disponível.
- Insights & BI (rankings, matriz venda×lucro, prateleira de filamentos, filtro de período — dados reais de `sales`/`orders`/`filaments`)
- Integrações: Mercado Pago conecta via OAuth automático (app "MakerFlow Vendas", separado do app de assinatura), um clique e volta conectado; webhook usa a Orders API (`GET /v1/orders/{id}`) roteado por `user_id` do payload (URL única pra aplicação inteira, não por maker); fallback "Sincronizar Pedidos" usa a Payments API de busca (não existe endpoint de busca documentado na Orders API) — as duas convergem no mesmo `external_order_id` (o id do pagamento, não do pedido) pra não duplicar venda. **Mercado Livre** conecta via OAuth próprio (`lib/mercadoLivre.ts`, app separado criado em developers.mercadolivre.com.br — token exchange é form-urlencoded, diferente do JSON do Mercado Pago), webhook no tópico `orders_v2`; extração de taxa (`payments[].marketplace_fee`) é best-effort, **validar contra payload real**. Shopee/TikTok Shop com estrutura de OAuth/webhook pronta, aguardando app aprovado nas duas plataformas.
- Impressoras (Cadastros → Impressoras): **controle patrimonial** (`printer_assets`/`printer_maintenance_logs` — modelo, filial, valor pago, nota fiscal, garantia, histórico de manutenção), não mais telemetria. A telemetria em tempo real (tabela `printers`, wizard de 4 passos, câmera, `bridge/`) continua no código, mas está **desligada por padrão** atrás de `NEXT_PUBLIC_ENABLE_REALTIME_TELEMETRY` (troque pra `true` pra reativar o card "Impressoras em Tempo Real" no Dashboard) — sem isso ligado, não tem porta de entrada na UI pro wizard de conexão.
- Configurações (taxas de marketplace, frete do remetente — persistidos de verdade)
- Financeiro (`/dashboard/finance`): KPIs de Receita Bruta/Custos Totais/Lucro Líquido Real/Vendas Canceladas, filtro de período+origem, gráfico de evolução, despesas via `extra_purchases` (botão "Nova Despesa"), exportar CSV e gerar relatório PDF — tudo com dados reais.
- Suporte (`/dashboard/support`): WhatsApp direto pra quem é pago; plano Grátis cai numa Central de Ajuda (`/dashboard/help`, FAQ estática).
- Assinatura (`/dashboard/subscription`): plano atual + comparação Grátis/Mensal/Trimestral (`PlanComparisonTable`, reaproveitada no `/pricing`), cartão automático (Mercado Pago preapproval) ou Pix manual. Créditos avulsos (comprar cota extra sem trocar de plano) foi **discutido mas adiado** — não construído ainda.
- Dashboard: pago vê card de resumo de vendas por período (Hoje/7d/30d/Este mês, breakdown por origem e lucro real) + produtos mais vendidos do mês (quantidade = nº de vendas daquele produto, não existe campo de quantidade unitária no schema). Grátis vê versão reduzida (contagens simples + vendas manuais do dia).
- Perfil do estúdio com upload de logo

## Planos e feature gating

3 tiers: **Grátis** (permanente), **Mensal** (R$19,90) e **Trimestral** (R$49,90, "Mais Popular") — `lib/plans.ts`. Sem eixo de ciclo separado: cada plano pago tem preço e frequência (`frequencyMonths`) fixos, não é mais "mesmo plano, ciclo diferente" (por isso `BillingToggle.tsx` foi removido).

**Reverse trial:** toda conta nova nasce com `subscription_tier = 'monthly'` direto no `handle_new_user()` (14 dias de acesso completo, sem pedir cartão). `app/dashboard/layout.tsx` faz um lazy-check a cada carregamento do dashboard — se `trial_ends_at` passou e `subscription_status != 'active'` (nunca virou assinante de verdade), rebaixa pra `free` automaticamente. Mesmo padrão já usado ali pro Pix vencido.

**Gating:** `lib/entitlements.ts` centraliza os limites do Grátis (10 clientes, 10 produtos, 5 filamentos, 1 filial) e o `isPaid(tier)` que libera o resto (PDF de orçamento, baixa automática de estoque, alerta de estoque baixo, Financeiro, Insights, Insumos/Compras Extras, Integrações, suporte via WhatsApp, Dashboard completo). `SubscriptionContext`/`useSubscription()` (`components/dashboard/SubscriptionContext.tsx`) passa o `tier` já resolvido no servidor (`dashboard/layout.tsx`) pra qualquer componente client via Context, sem cada tela precisar buscar o profile de novo. `UpgradeGate.tsx` é a tela padrão de cadeado usada nas áreas totalmente bloqueadas.

## Ferramentas de desenvolvimento

- **Claude Code** conectado ao Supabase via MCP (`.mcp.json` na raiz) — já autenticado, consegue criar tabelas, rodar migrações e consultar dados do projeto `makerflow` diretamente
- `push.ps1` na raiz — atalho pra `git add . && git commit -m "..." && git push` num comando só

## Erros recorrentes nesta sessão (pra não repetir)

1. **Conteúdo colado no arquivo errado** foi o bug mais comum — sempre confirme o caminho completo (`app/dashboard/X/page.tsx` vs `app/page.tsx` vs `app/X/page.tsx`) antes de substituir.
2. **jsPDF com `unit: "px"`** corta o conteúdo — sempre usar `unit: "mm", format: "a4"` e escalar a imagem pela largura da página.
3. **tsconfig.json**: não usar `"ignoreDeprecations": "6.0"` (valor inválido, quebra o build) — se for mexer nisso, é `"5.0"`, mas geralmente é mais seguro nem mexer.
4. Cache do TS Server do VS Code às vezes mostra "Cannot find module" fantasma pra arquivo que existe — `Ctrl+Shift+P` → `TypeScript: Restart TS Server` resolve.
5. A câmera das impressoras Bambu Lab A1/A1 Mini/P1P/P1S **não é RTSP** (apesar de bastante coisa por aí dizer o contrário) — é um protocolo proprietário próprio na porta 6000 (implementado em `bridge/core.py`). Só X1/X1C usa RTSPS de verdade (porta 322).
6. A doc de referência da Orders API do Mercado Pago (`GET /v1/orders/{id}`) não carrega via fetch de página (404 — parece SPA client-side-only). `lib/mercadoPago.ts` (`fetchMercadoPagoOrderForIntegration`/`upsertQuoteFromMercadoPagoOrder`) foi escrito com extração defensiva dos campos (fee/payer/items) com base em documentação parcial — **validar contra um payload real** assim que a primeira notificação de venda chegar de verdade. Mesma ressalva vale pra `lib/mercadoLivre.ts` (doc do Mercado Livre bloqueou o fetch com 403).
7. A MCP do Supabase desconectou no meio da sessão uma vez — nesse caso, migrations (ex: adicionar `cancelled`/`mercado_livre` aos check constraints de `quotes`/`integrations`) tiveram que ser entregues como SQL pra colar manualmente no SQL Editor do painel, em vez de aplicadas direto. Se voltar a acontecer, confirme com o usuário se prefere reconectar a MCP ou receber o SQL.

## Ideias guardadas pro roadmap (ainda não construídas)

- Shopee e TikTok Shop: falta só o app ser aprovado nas respectivas plataformas (Shopee Open Platform / TikTok Shop Partner Center) — código já está pronto, só configurar `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY`/`TIKTOK_APP_KEY`/`TIKTOK_APP_SECRET`
- Emissão de Nota Fiscal real (precisa de provedor fiscal certificado tipo NFE.io/Focus NFe — botão já existe desativado no overlay de Vendas)
- Link de cobrança real por pedido (pro cliente do maker pagar), com webhook próprio separado da assinatura do StudioMaker
- Créditos avulsos na Assinatura: comprar cota extra de orçamentos sem trocar de plano — adiado, precisa definir preço/quantidade do pacote e forma de cobrança antes de construir

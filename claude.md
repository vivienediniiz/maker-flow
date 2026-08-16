# MakerFlow — Contexto do Projeto

SaaS de gestão para makers/estúdios de impressão 3D. Next.js 14 (App Router) + TypeScript + Tailwind + Supabase + Mercado Pago.

## Stack e infraestrutura

- **Deploy:** Netlify, auto-deploy a partir do repositório GitHub `vivienediniiz/maker-flow` (com hífen — existe também um `makerflow` sem hífen, mais antigo e **não usado**, cuidado pra não confundir)
- **Site:** maker-flow.netlify.app
- **Supabase:** projeto `makerflow`, ID `dgcdltcpvnultwduypcu`, região `sa-east-1` (São Paulo)
- **Mercado Pago — DOIS apps separados, não confundir:**
  - **"Makerflow3d"**: `MERCADOPAGO_ACCESS_TOKEN`/`MERCADOPAGO_PUBLIC_KEY`, cobra a assinatura do MakerFlow em si (cartão automático + Pix manual). Webhook: `/api/webhooks/mercadopago`. Não mexer nisso pra vendas.
  - **"MakerFlow Vendas"**: `MERCADO_PAGO_VENDAS_CLIENT_ID`/`_CLIENT_SECRET`/`_WEBHOOK_SECRET`, app OAuth separado que cada maker conecta pra receber notificação das próprias vendas (ver "Integrações" abaixo). Webhook: `/api/webhooks/mercado-pago` (com hífen entre "mercado" e "pago" — cuidado, é bem parecido com a URL do app de assinatura).
- **`bridge/`**: script Python separado (fora do app Next.js) que roda no computador do maker, na rede local da impressora Bambu Lab, e manda telemetria + snapshot de câmera pro MakerFlow via webhook. Tem versão CLI (`bridge.py`, dev) e GUI empacotada em `.exe` via PyInstaller (`bridge_gui.py`, cliente final — hospedado no bucket `bridge-releases` do Supabase Storage). Ver `bridge/README.md`.

## Design system

- Fundo `#0B0914`, gradiente neon `#E86333 → #FF4EDF → #AA17DB`
- Fontes: **Exo 2** pra títulos (`font-display`), **Chakra Petch** pra números/valores (`font-numeric`), **Montserrat** pro resto (`font-sans`)
- Componentes base em `components/ui/`: GlassCard, NeonButton, Modal, Toggle, SegmentedControl, StatusBadge, PasswordInput

## Estrutura do banco (Supabase)

Tabelas principais: `profiles`, `printers`, `filaments`, `quotes`, `orders` (não usada ativamente — `quotes` virou a fonte única de verdade pro fluxo de vendas), `products`, `settings`, `clients`, `categories`, `sales`, `branches`, `supplies`, `extra_purchases`, `integrations`.

`quotes` é o coração do sistema de Vendas (tela antes chamada "Pedidos"): tem `status` (`sent`/`paid`/`in_production`/`shipped`/`expired`), `order_number` (sequencial automático via trigger), `channel` (canal de venda escolhido manualmente), `source` (`mercado_pago`/`shopee`/`tiktok_shop`/`manual` — origem do *registro*, diferente de `channel`), `external_order_id` (idempotência de webhook, unique junto com `user_id`+`source`), `buyer_name`, `platform_fee`, `cost_amount`, `net_amount` (coluna gerada), `payment_method`, `shipping_cost`, `destination_cep`, `product_id` (vínculo opcional com um produto do catálogo).

`printers` guarda telemetria (`current_*`, `last_telemetry_at`) e câmera (`last_snapshot_at`) recebidas via `/api/v1/printers/telemetry` e `/api/v1/printers/snapshot`, autenticado por `api_key_webhook` (gerado automaticamente por impressora).

`integrations` guarda a conexão do maker com plataformas de venda (Mercado Pago/Shopee/TikTok Shop). Credenciais **nunca** ficam em texto puro — vão pro Supabase Vault via funções `security definer` (`public.integration_set_credential`/`_get_credential`/`_delete_credential`, só acessíveis por `service_role`). `integrations.credential_secret_id` só guarda a referência.

`products.calc_inputs` (jsonb) guarda o snapshot completo dos parâmetros da Calculadora quando um produto é criado por lá — permite recarregar o cálculo depois.

Buckets de Storage: `avatars` (logo do estúdio), `products` (fotos de produto), `bridge-releases` (público, `.exe` do bridge), `printer-snapshots` (público, foto mais recente da câmera de cada impressora).

## Funcionalidades já construídas

- Auth completo (login/signup/logout/troca de senha), trial de 7 dias. Tela de **login** tem visual próprio (fundo aurora animado, painel "liquid glass", headline com efeito de digitação, login social Google/Facebook) e por isso vive num route group dedicado `app/(login)/login/` — separado do `app/(auth)/` que ainda serve Signup/Reset (layout de duas colunas simples). Login social usa `supabase.auth.signInWithOAuth` + callback em `app/auth/callback/route.ts`; **precisa configurar os provedores Google/Facebook em Supabase → Authentication → Providers** (Client ID/Secret do Google Cloud Console / Meta for Developers) antes de funcionar de verdade — até lá os botões aparecem mas retornam erro do Supabase ("Unsupported provider").
- Dashboard, Calculadora (com seletor de produto existente, faixas de preço, marketplace vindo de Configurações)
- Clientes (lista em tabela, busca)
- Produtos (lista em tabela, foto, overlay de detalhe)
- Vendas (ex-"Pedidos": grid de cards com badge de origem, Bruto/Custos/Líquido, filtro de status + canal de origem, overlay com barra de status **só avança**, doc. de envio em PDF)
- Estoque 3D (Adicionar Estoque + venda com histórico real)
- Cadastros (Impressoras, Filamentos, Insumos, Compras Extras, Filiais, Categorias — todas com CRUD real)
- Insights & BI (rankings, matriz venda×lucro, prateleira de filamentos, filtro de período — dados reais de `sales`/`orders`/`filaments`)
- Integrações: Mercado Pago conecta via OAuth automático (app "MakerFlow Vendas", separado do app de assinatura), um clique e volta conectado; webhook usa a Orders API (`GET /v1/orders/{id}`) roteado por `user_id` do payload (URL única pra aplicação inteira, não por maker); fallback "Sincronizar Pedidos" usa a Payments API de busca (não existe endpoint de busca documentado na Orders API) — as duas convergem no mesmo `external_order_id` (o id do pagamento, não do pedido) pra não duplicar venda. Shopee/TikTok Shop com estrutura de OAuth/webhook pronta, aguardando app aprovado nas duas plataformas.
- Impressoras: cadastro real (Cadastros → Impressoras), wizard de conexão de 4 passos, telemetria + câmera via `bridge/` (ver acima)
- Configurações (taxas de marketplace, frete do remetente — persistidos de verdade)
- Assinatura MakerFlow: cartão automático (Mercado Pago preapproval) + Pix manual (com tolerância de 15 dias)
- Perfil do estúdio com upload de logo

## Ferramentas de desenvolvimento

- **Claude Code** conectado ao Supabase via MCP (`.mcp.json` na raiz) — já autenticado, consegue criar tabelas, rodar migrações e consultar dados do projeto `makerflow` diretamente
- `push.ps1` na raiz — atalho pra `git add . && git commit -m "..." && git push` num comando só

## Erros recorrentes nesta sessão (pra não repetir)

1. **Conteúdo colado no arquivo errado** foi o bug mais comum — sempre confirme o caminho completo (`app/dashboard/X/page.tsx` vs `app/page.tsx` vs `app/X/page.tsx`) antes de substituir.
2. **jsPDF com `unit: "px"`** corta o conteúdo — sempre usar `unit: "mm", format: "a4"` e escalar a imagem pela largura da página.
3. **tsconfig.json**: não usar `"ignoreDeprecations": "6.0"` (valor inválido, quebra o build) — se for mexer nisso, é `"5.0"`, mas geralmente é mais seguro nem mexer.
4. Cache do TS Server do VS Code às vezes mostra "Cannot find module" fantasma pra arquivo que existe — `Ctrl+Shift+P` → `TypeScript: Restart TS Server` resolve.
5. A câmera das impressoras Bambu Lab A1/A1 Mini/P1P/P1S **não é RTSP** (apesar de bastante coisa por aí dizer o contrário) — é um protocolo proprietário próprio na porta 6000 (implementado em `bridge/core.py`). Só X1/X1C usa RTSPS de verdade (porta 322).
6. A doc de referência da Orders API do Mercado Pago (`GET /v1/orders/{id}`) não carrega via fetch de página (404 — parece SPA client-side-only). `lib/mercadoPago.ts` (`fetchMercadoPagoOrderForIntegration`/`upsertQuoteFromMercadoPagoOrder`) foi escrito com extração defensiva dos campos (fee/payer/items) com base em documentação parcial — **validar contra um payload real** assim que a primeira notificação de venda chegar de verdade.

## Ideias guardadas pro roadmap (ainda não construídas)

- Shopee e TikTok Shop: falta só o app ser aprovado nas respectivas plataformas (Shopee Open Platform / TikTok Shop Partner Center) — código já está pronto, só configurar `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY`/`TIKTOK_APP_KEY`/`TIKTOK_APP_SECRET`
- Emissão de Nota Fiscal real (precisa de provedor fiscal certificado tipo NFE.io/Focus NFe — botão já existe desativado no overlay de Vendas)
- Link de cobrança real por pedido (pro cliente do maker pagar), com webhook próprio separado da assinatura do MakerFlow

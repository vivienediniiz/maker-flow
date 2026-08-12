# MakerFlow — Contexto do Projeto

SaaS de gestão para makers/estúdios de impressão 3D. Next.js 14 (App Router) + TypeScript + Tailwind + Supabase + Mercado Pago.

## Stack e infraestrutura

- **Deploy:** Netlify, auto-deploy a partir do repositório GitHub `vivienediniiz/maker-flow` (com hífen — existe também um `makerflow` sem hífen, mais antigo e **não usado**, cuidado pra não confundir)
- **Site:** maker-flow.netlify.app
- **Supabase:** projeto `makerflow`, ID `dgcdltcpvnultwduypcu`, região `sa-east-1` (São Paulo)
- **Mercado Pago:** credenciais de produção configuradas (assinatura via cartão) + fluxo Pix manual avulso

## Design system

- Fundo `#0B0914`, gradiente neon `#E86333 → #FF4EDF → #AA17DB`
- Fontes: **Exo 2** pra títulos (`font-display`), **Chakra Petch** pra números/valores (`font-numeric`), **Montserrat** pro resto (`font-sans`)
- Componentes base em `components/ui/`: GlassCard, NeonButton, Modal, Toggle, SegmentedControl, StatusBadge, PasswordInput

## Estrutura do banco (Supabase)

Tabelas principais: `profiles`, `printers`, `filaments`, `quotes`, `orders` (não usada ativamente — `quotes` virou a fonte única de verdade pro fluxo de pedidos), `products`, `settings`, `clients`, `categories`, `sales`.

`quotes` é o coração do sistema de Pedidos: tem `status` (`sent`/`paid`/`in_production`/`shipped`/`expired`), `order_number` (sequencial automático via trigger), `channel`, `payment_method`, `shipping_cost`, `destination_cep`, `product_id` (vínculo opcional com um produto do catálogo).

`products.calc_inputs` (jsonb) guarda o snapshot completo dos parâmetros da Calculadora quando um produto é criado por lá — permite recarregar o cálculo depois.

Buckets de Storage: `avatars` (logo do estúdio), `products` (fotos de produto).

## Funcionalidades já construídas

- Auth completo (login/signup/logout/troca de senha), trial de 7 dias
- Dashboard, Calculadora (com seletor de produto existente, faixas de preço, marketplace vindo de Configurações)
- Clientes (lista em tabela, busca)
- Produtos (lista em tabela, foto, overlay de detalhe)
- Pedidos (lista, número sequencial, overlay com barra de status **só avança**, doc. de envio em PDF)
- Estoque 3D (Adicionar Estoque + venda com histórico real)
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

## Ideias guardadas pro roadmap (ainda não construídas)

- Integração com APIs de marketplace (Mercado Livre, Shopee, TikTok Shop) pra puxar pedidos automaticamente
- Status de impressora em tempo real via MQTT local (Bambu Lab) — usar biblioteca `bambulabs-api`, precisa de um script/agente rodando na rede local do usuário, já que o endpoint `/api/v1/printers/telemetry` existe mas não está conectado a nada real ainda
- Emissão de Nota Fiscal real (precisa de provedor fiscal certificado tipo NFE.io/Focus NFe — botão já existe desativado no overlay de Pedidos)
- Link de cobrança real por pedido (pro cliente do maker pagar), com webhook próprio separado da assinatura do MakerFlow
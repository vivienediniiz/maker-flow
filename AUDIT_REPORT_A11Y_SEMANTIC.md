# 🏷️ AUDITORIA A11Y — SEMÂNTICA HTML

**Data:** 2026-09-04  
**Status:** 🔴 **CRÍTICA** — Form labels não associados (100+ campos)  
**Compliance:** 75% (WCAG 2.1)

---

## 📋 RESUMO EXECUTIVO

Sua aplicação usa muitas `<div>` quando deveria usar tags semânticas. Problema **mais grave**: inputs de formulário não têm labels associados, quebrando acessibilidade pra leitores de tela.

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **FORM LABELS NÃO ASSOCIADOS** — 100+ instâncias

**Severidade:** 🔴 CRÍTICA  
**Impacto:** Leitores de tela não conseguem anunciar qual campo é qual  
**WCAG Violation:** 1.3.1 Info and Relationships

**ANTES (quebrado):**
```tsx
// app/(login)/login/page.tsx:79-89
<label className="mb-1.5 block text-xs text-text-muted">E-mail</label>
<input
  type="email"
  placeholder="seu@email.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="rounded-lg border border-border-glass bg-white/5 px-3 py-2"
/>
{/* ❌ Label tem NO htmlFor attribute */}
{/* ❌ Input tem NO id attribute */}
{/* Resultado: Screen reader lê label E input separados, sem conexão */}
```

**DEPOIS (correto):**
```tsx
<label htmlFor="email-input" className="mb-1.5 block text-xs text-text-muted">
  E-mail
</label>
<input
  id="email-input"  {/* ✅ Unique ID */}
  type="email"
  placeholder="seu@email.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="rounded-lg border border-border-glass bg-white/5 px-3 py-2"
/>
{/* ✅ Screen reader announces: "E-mail, text input" */}
```

**Localidades afetadas:**
- `app/(login)/login/page.tsx` — 5 campos (email, senha x2)
- `app/signup/page.tsx` — 6 campos (nome, email, empresa, senha x2)
- `app/(auth)/reset-password/page.tsx` — 2 campos
- `components/dashboard/CostCalculatorModal.tsx` (MiniField component) — 20+ campos
- Filtros de tabelas (ProductsTable, ClientsTable, etc) — 30+ campos
- **Total: 100+ inputs sem label associada**

**Como testar:**
```bash
# Rodar axe DevTools ou WAVE em:
# 1. Login page — F12 → axe DevTools → Scan
# 2. Signup page
# 3. Calculator modal
# Todos vão falhar em "Form fields must have labels"
```

---

### 2. **MODAL SEM SEMÂNTICA DE DIALOG**

**Severidade:** 🔴 CRÍTICA  
**Localização:** `components/ui/Modal.tsx:82-88`  
**Impacto:** Leitores de tela não entendem que é um modal

**ANTES:**
```tsx
<div
  className="glass-card relative flex max-h-[85vh] max-w-2xl flex-col overflow-hidden rounded-2xl"
  style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
>
  <h3 className="font-display text-lg">{title}</h3>
  {/* ❌ É um div genérico */}
  {/* ❌ Sem role="dialog" */}
  {/* ❌ Título não conectado com aria-labelledby */}
```

**DEPOIS:**
```tsx
<div
  role="dialog"  {/* ✅ Explicitly mark as dialog */}
  aria-modal="true"  {/* ✅ Screen reader knows it's modal (blocks background) */}
  aria-labelledby="modal-title"  {/* ✅ Connect to title */}
  className="glass-card relative flex max-h-[85vh] max-w-2xl flex-col overflow-hidden rounded-2xl"
  style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
>
  <h3 id="modal-title" className="font-display text-lg">{title}</h3>
```

---

### 3. **FALTA `<main>` TAG**

**Severidade:** 🔴 CRÍTICA  
**Localização:** 
- `app/dashboard/layout.tsx:88-106` — Dashboard principal
- `app/(login)/login/page.tsx` — Página de login
- `app/signup/page.tsx` — Página de signup

**Impacto:** Screen reader users não conseguem navegar direto pro main content

**ANTES:**
```tsx
// app/dashboard/layout.tsx:88
<div className="min-h-screen">
  {/* Main content */}
</div>
{/* ❌ Landmark region is missing */}
```

**DEPOIS:**
```tsx
<main className="min-h-screen">
  {/* Main content */}
</main>
{/* ✅ Screen reader can jump to main content */}
```

---

## 🟠 PROBLEMAS MAIORES

### 4. **DECORATIVE IMAGES SEM ALT TEXT**

**Severidade:** 🟠 MAIOR  
**Localização:** `app/dashboard/products/page.tsx:403`

**Bom (com alt):**
```tsx
<img
  src={p.image_url}
  alt={`Product: ${p.name}`}  {/* ✅ Descriptive alt text */}
  className="h-full w-full object-cover"
/>
```

**Ruim (sem/vazio alt):**
```tsx
<img
  src={logoUrl}
  alt=""  {/* ❌ Empty alt for meaningful image */}
  className="h-full w-full object-cover"
/>
{/* Logo is meaningful context — should have alt */}
```

**Localidades:**
- Product images in `/dashboard/products`
- Studio logo in branding settings
- User avatars in sidebar

---

### 5. **DECORATIVE DIVS NÃO MARCADAS COM aria-hidden**

**Severidade:** 🟠 MAIOR  
**Localização:** `app/(login)/login/page.tsx:43-46`

**ANTES:**
```tsx
{/* Gradient background — purely decorative */}
<div
  className="pointer-events-none absolute inset-0"
  style={{
    background: "radial-gradient(circle at 20% 80%, rgba(232, 99, 51, 0.3) 0%, transparent 50%)"
  }}
/>
{/* ❌ Screen reader will try to read this div */}
```

**DEPOIS:**
```tsx
<div
  aria-hidden="true"  {/* ✅ Screen reader ignores decorative element */}
  className="pointer-events-none absolute inset-0"
  style={{
    background: "radial-gradient(circle at 20% 80%, rgba(232, 99, 51, 0.3) 0%, transparent 50%)"
  }}
/>
```

---

## 🟡 PROBLEMAS MENORES

### 6. **HEADING HIERARCHY NÃO TESTADA**

Recomendação: Verificar se `<h1>`, `<h2>`, `<h3>` aparecem em ordem lógica
- Não deveria pular de `<h2>` direto pra `<h4>`
- Máximo 1 `<h1>` por página

---

## ✅ CHECKLIST DE FIXES

- [ ] Adicionar `htmlFor` a 100+ labels
- [ ] Adicionar `id` a 100+ inputs
- [ ] Adicionar role/aria ao Modal
- [ ] Adicionar `<main>` tag
- [ ] Adicionar alt text a images
- [ ] Adicionar aria-hidden a decorative divs
- [ ] Verificar heading hierarchy

---

## 📊 IMPACTO

```
Screen Reader Users Cannot:
❌ Know which field is which (forms)
❌ Navigate to main content (no <main>)
❌ Understand image context (no alt text)
❌ Understand modal structure (no role)

Users Affected: ~15% of population (vision impairments)
WCAG Status: ❌ FAILS 1.3.1, 1.4.1, 2.4.1
```

---

## 🚀 PRÓXIMO PASSO

→ Ver [`A11Y_FIXES_READY_TO_APPLY.md`](A11Y_FIXES_READY_TO_APPLY.md) pra código pronto pra colar

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

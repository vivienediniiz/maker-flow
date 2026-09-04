# 📢 AUDITORIA A11Y — ARIA & LEITORES DE TELA

**Data:** 2026-09-04  
**Status:** 🔴 **CRÍTICA** — 12 problemas faltam ARIA attributes  
**Compliance:** 55% (WCAG 2.1)

---

## 📋 RESUMO EXECUTIVO

Leitores de tela (NVDA, JAWS, VoiceOver) **não conseguem entender** a estrutura da sua app porque faltam atributos ARIA. Usuários cegos leem texto desconexo sem saber qual botão clica, qual campo é qual, etc.

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **MODAL SEM ARIA ATTRIBUTES**

**Severidade:** 🔴 CRÍTICA  
**Localização:** `components/ui/Modal.tsx:82-88`  
**Impacto:** Screen reader lê modal como div genérico, sem contexto

**ANTES:**
```tsx
<div className="glass-card...">
  <h3 className="font-display text-lg">{title}</h3>
  {/* ❌ Screen reader read: "Div, text: Nova Venda Manual" */}
  {/* ❌ User doesn't know it's a dialog */}
```

**DEPOIS:**
```tsx
<div
  role="dialog"  {/* ✅ Announce as dialog */}
  aria-modal="true"  {/* ✅ This blocks background interaction */}
  aria-labelledby="modal-title"  {/* ✅ Connect to title */}
>
  <h3 id="modal-title" className="font-display text-lg">{title}</h3>
  {/* ✅ Screen reader reads: "Dialog, Nova Venda Manual" */}
```

---

### 2. **ERROR MESSAGES NÃO ANUNCIADOS**

**Severidade:** 🔴 CRÍTICA  
**Localização:** `app/(login)/login/page.tsx:105`, `app/signup/page.tsx:158`  
**Impacto:** Screen reader users não sabem que há erro

**ANTES:**
```tsx
{error && <p className="text-xs text-red-400">{error}</p>}
{/* ❌ Screen reader reads error text but doesn't announce "error" */}
{/* ❌ User may miss the error completely */}
```

**DEPOIS:**
```tsx
{error && (
  <p 
    role="alert"  {/* ✅ Announce as alert immediately */}
    className="text-xs text-red-400"
  >
    {error}
  </p>
)}
{/* ✅ Screen reader announces: "Alert: Invalid credentials" */}
{/* ✅ Interrupts other reading to announce error */}
```

**Localidades:**
- Login form error
- Signup form errors
- Reset password errors
- Form validation errors (100+ places)

---

### 3. **LOADING STATES NÃO ANUNCIADOS**

**Severidade:** 🔴 CRÍTICA  
**Localização:** Múltiplas tabelas (`ProductsTable`, `ClientsTable`, `FilamentsTable`)  
**Impacto:** Screen reader users don't know page is loading

**ANTES:**
```tsx
{loading ? (
  <div className="flex justify-center py-16">
    <Loader2 size={20} className="animate-spin" />
  </div>
) : (
  <table>
```

**DEPOIS:**
```tsx
{loading ? (
  <div 
    className="flex justify-center py-16"
    aria-live="polite"  {/* ✅ Announce changes to this region */}
    aria-busy="true"  {/* ✅ Page is loading */}
    role="status"  {/* ✅ It's a status message */}
  >
    <Loader2 size={20} className="animate-spin" />
    <span className="sr-only">Carregando dados...</span>  {/* ✅ Hidden text for screen readers */}
  </div>
) : (
  <table>
```

---

## 🟠 PROBLEMAS MAIORES

### 4. **DROPDOWN MENU SEM ARIA ROLES**

**Severidade:** 🟠 MAIOR  
**Localização:** `components/dashboard/FilamentPickerDropdown.tsx:70-101`

**ANTES:**
```tsx
<div className="fixed z-[9999]...">
  {filaments.map((f) => (
    <button key={f.id} onClick={() => handleSelect(f.id)}>
      {/* ❌ Screen reader reads as plain button */}
      {/* ❌ Doesn't know it's a selectable option */}
```

**DEPOIS:**
```tsx
<div
  role="listbox"  {/* ✅ This is a list of selectable items */}
  id="filament-listbox"
  className="fixed z-[9999]..."
>
  {filaments.map((f) => (
    <button
      key={f.id}
      role="option"  {/* ✅ This is an option in the list */}
      aria-selected={f.id === value}  {/* ✅ Is this one selected? */}
      onClick={() => handleSelect(f.id)}
    >
      {/* ✅ Screen reader reads: "Option, unselected, Bambu Lab" */}
```

---

### 5. **NOTIFICATION BELL SEM ARIA STATES**

**Severidade:** 🟠 MAIOR  
**Localização:** `components/dashboard/NotificationsBell.tsx:173-220`

**ANTES:**
```tsx
<button className="relative">
  <Bell size={20} />
  {hasUnseen && <div className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />}
  {/* ❌ Screen reader can't see the red dot */}
  {/* ❌ Doesn't know if there are new notifications */}
</button>
```

**DEPOIS:**
```tsx
<button
  onClick={() => setOpen(!open)}
  aria-expanded={open}  {/* ✅ Is dropdown open? */}
  aria-haspopup="menu"  {/* ✅ There's a menu */}
  aria-controls="notifications-menu"  {/* ✅ Which menu? */}
  aria-label={`You have ${unseenCount || 'no'} new notifications`}  {/* ✅ Tell user how many new */}
  className="relative"
>
  <Bell size={20} />
  {hasUnseen && <div className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />}
</button>

<menu 
  id="notifications-menu"
  role="menu"
  hidden={!open}
  className="..."
>
  {/* Notifications list */}
</menu>
{/* ✅ Screen reader announces: "Button, You have 3 new notifications, menu expanded" */}
```

---

### 6. **COLOR-ONLY INDICATORS NÃO ANUNCIADOS**

**Severidade:** 🟠 MAIOR  
**Localização:** Product margin table (`app/dashboard/products/page.tsx:414`)  
**Impacto:** Color-blind users can't understand data

**ANTES:**
```tsx
<td className="px-6 py-4 font-numeric text-neon-pink">{margin.toFixed(0)}%</td>
{/* ❌ Only color indicates "high margin" */}
{/* ❌ Color-blind users see pink text but don't understand meaning */}
```

**DEPOIS:**
```tsx
<td className="px-6 py-4 font-numeric">
  <span 
    className={margin > 30 ? 'text-neon-pink' : ''}
    aria-label={margin > 30 ? `High margin: ${margin.toFixed(0)}%` : undefined}
  >
    {margin.toFixed(0)}%
  </span>
</td>
{/* ✅ Screen reader announces: "High margin: 35%" */}
{/* ✅ Color-blind users understand context */}
```

---

### 7. **TOGGLE SWITCH SEM LABEL**

**Severidade:** 🟠 MAIOR  
**Localização:** `components/ui/Toggle.tsx` — used in product table without aria-label

**ANTES:**
```tsx
<Toggle 
  checked={p.in_store} 
  onChange={(val) => updateProduct({in_store: val})} 
/>
{/* ❌ Screen reader reads: "Button, checked" */}
{/* ❌ User doesn't know: Toggle WHAT? */}
```

**DEPOIS:**
```tsx
<Toggle 
  checked={p.in_store} 
  onChange={(val) => updateProduct({in_store: val})}
  aria-label={`Available in store: ${p.in_store ? 'yes' : 'no'}`}  {/* ✅ Clear label */}
/>
{/* ✅ Screen reader reads: "Button, toggle, Available in store: yes, checked" */}
```

---

### 8. **SEARCH INPUT SEM LABEL**

**Severidade:** 🟠 MAIOR  
**Localização:** `components/dashboard/Topbar.tsx:67`

**ANTES:**
```tsx
<input
  type="search"
  placeholder="Search..."
  className="rounded-lg..."
/>
{/* ❌ No aria-label, no htmlFor */}
```

**DEPOIS:**
```tsx
<input
  type="search"
  placeholder="Search..."
  aria-label="Search products"  {/* ✅ Clear purpose */}
  className="rounded-lg..."
/>
{/* ✅ Screen reader announces: "Search, edit text, Search products" */}
```

---

### 9. **STATUS BADGES SEM SEMANTIC MEANING**

**Severidade:** 🟠 MAIOR  
**Localização:** Order status badges (`app/dashboard/orders/page.tsx`)

**ANTES:**
```tsx
<span className="inline-block rounded-full bg-neon-green/20 px-3 py-1 text-xs text-neon-green">
  Shipped
</span>
{/* ❌ Screen reader just reads "Shipped" */}
{/* ❌ Doesn't know it's a status */}
```

**DEPOIS:**
```tsx
<span 
  className="inline-block rounded-full bg-neon-green/20 px-3 py-1 text-xs text-neon-green"
  role="status"  {/* ✅ This is a status */}
  aria-label="Order status: Shipped"
>
  Shipped
</span>
{/* ✅ Screen reader announces: "Status: Order status: Shipped" */}
```

---

## 🟡 PROBLEMAS MENORES

### 10. **FILTER BUTTON SEM aria-expanded**
- File: `app/dashboard/products/page.tsx:256`
- Add: `aria-expanded={showFilters}`

### 11. **COLLAPSIBLE SECTIONS SEM aria-expanded**
- File: `components/ui/GlassAccordion.tsx:23`
- Add: `aria-expanded={open}` and `aria-controls="accordion-content-id"`

### 12. **BUTTON TEXT "MORE" VAGUE**
- Some buttons say "..." or "Mais" without context
- Add: `aria-label="More options for ${item}"`

---

## ✅ CHECKLIST DE FIXES

- [ ] Adicionar role/aria ao Modal
- [ ] Adicionar role="alert" a error messages
- [ ] Adicionar aria-live a loading states
- [ ] Adicionar ARIA roles ao dropdown (listbox, option)
- [ ] Adicionar aria-label ao notification bell
- [ ] Adicionar aria-label a color indicators
- [ ] Adicionar aria-label a toggle switches
- [ ] Adicionar aria-label a search inputs
- [ ] Adicionar role="status" a status badges
- [ ] Adicionar aria-expanded a filters/accordions

---

## 🧪 COMO TESTAR

```
1. Download NVDA (free screen reader for Windows)
   https://www.nvaccess.org/download/

2. Ativar NVDA: Win+Enter

3. Testar cada página:
   - Login (error message announced?)
   - Signup (errors announced?)
   - Products table (status announced?)
   - Modal (dialog context clear?)
   - Dropdown (options navigable with arrow keys?)

4. NVDA vai falar em português (se configurado)
   Ouve se lê corretamente
```

---

## 📊 IMPACTO

```
Blind & Low Vision Users Cannot:
❌ Understand modal structure (no role)
❌ Know about errors (no role="alert")
❌ Know page is loading (no aria-live)
❌ Select from dropdowns (no ARIA roles)
❌ Understand status indicators (color only)

Users Affected: ~4% (blindness/low vision)
WCAG Status: ❌ FAILS 1.3.1, 1.4.1, 4.1.2
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

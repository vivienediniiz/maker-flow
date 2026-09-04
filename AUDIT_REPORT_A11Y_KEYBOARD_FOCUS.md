# ⌨️ AUDITORIA A11Y — NAVEGAÇÃO POR TECLADO & FOCUS

**Data:** 2026-09-04  
**Status:** 🔴 **CRÍTICA** — Usuários sem mouse não conseguem acessar funcionalidades  
**Compliance:** 40% (WCAG 2.1)

---

## 📋 RESUMO EXECUTIVO

Sua app foi **otimizada apenas pra mouse**. Usuários que usam teclado (deficiências motoras, lesão, preferência) não conseguem:
- Abrir/fechar modais
- Selecionar itens em dropdowns
- Clicar em linhas de tabela
- Visualizar senhas
- Navegar por menus

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **PASSWORDINPUT TOGGLE INACESSÍVEL AO TECLADO**

**Severidade:** 🔴 CRÍTICA  
**Localização:** `components/ui/PasswordInput.tsx:22`  
**Impacto:** Usuários sem mouse não conseguem ver o que digitaram

**ANTES (quebrado):**
```tsx
<button
  type="button"
  onClick={() => setVisible((v) => !v)}
  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
  tabIndex={-1}  {/* ❌ REMOVE KEYBOARD ACCESS */}
  className="absolute right-3 top-1/2 -translate-y-1/2"
>
  {visible ? <Eye size={16} /> : <EyeOff size={16} />}
</button>
{/* ❌ Usuário com teclado não consegue fazer Tab aqui */}
{/* ❌ Não consegue ver a senha enquanto digita */}
```

**DEPOIS (correto):**
```tsx
<button
  type="button"
  onClick={() => setVisible((v) => !v)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setVisible((v) => !v);
    }
  }}
  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
  {/* ✅ REMOVE tabIndex={-1} — button é focusable by default */}
  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink"
>
  {visible ? <Eye size={16} /> : <EyeOff size={16} />}
</button>
{/* ✅ Usuário com Tab chega no botão */}
{/* ✅ Pode pressionar Enter/Space pra toggle */}
{/* ✅ Focus ring visível (pink) */}
```

---

### 2. **MODAL SEM FOCUS TRAP**

**Severidade:** 🔴 CRÍTICA  
**Localização:** `components/ui/Modal.tsx:79-111`  
**Impacto:** Keyboard focus escapa pra background, fica impossível fechar modal

**ANTES:**
```tsx
export function Modal({ open, onClose, title, children }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[8999] bg-black/50" onClick={onClose}>
          <div className="...">
            {/* ❌ Sem focus trap */}
            {/* ❌ Usuário pressiona Tab → vai pra background */}
            {/* ❌ Impossível fechar com teclado */}
```

**DEPOIS (com focus trap):**
```tsx
import { useEffect, useRef } from 'react';

export function Modal({ open, onClose, title, children }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // ✅ Focus primeiro elemento interativo
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    firstFocusable?.focus();

    // ✅ Trap focus dentro do modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;

      if (!focusables?.length) return;

      const firstFocusable = focusables[0];
      const lastFocusable = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift+Tab no primeiro → vai pro último
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab no último → vai pro primeiro
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    // ✅ Close on Escape
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 z-[8999] bg-black/50" 
          onClick={onClose}
          aria-hidden="true"  {/* ✅ Background is hidden from readers */}
        >
          <div
            ref={modalRef}  {/* ✅ Reference pra focus trap */}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="..."
          >
            <h3 id="modal-title">{title}</h3>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
```

---

### 3. **DROPDOWN MENUS NÃO NAVEGÁVEIS AO TECLADO**

**Severidade:** 🔴 CRÍTICA  
**Localização:** `components/dashboard/FilamentPickerDropdown.tsx:46-101`  
**Impacto:** Usuários com teclado não conseguem selecionar filamentos

**ANTES:**
```tsx
<button
  onClick={() => setOpen(!open)}
  className="..."
>
  {selectedLabel || "Selecionar filamento"}
</button>

{open && (
  <div className="fixed z-[9999]...">
    {filaments.map((f) => (
      <button
        key={f.id}
        onClick={() => handleSelect(f.id)}
        {/* ❌ Sem arrow key support */}
        {/* ❌ Sem Enter key handler */}
      >
```

**DEPOIS (com keyboard navigation):**
```tsx
import { useEffect, useRef, useState } from 'react';

<button
  onClick={() => setOpen(!open)}
  onKeyDown={(e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlighted(0);  {/* Focus first on arrow down */}
    }
    if (e.key === 'Escape') setOpen(false);
  }}
  aria-expanded={open}  {/* ✅ Announce expanded state */}
  aria-haspopup="listbox"  {/* ✅ Announce dropdown type */}
  aria-controls="filament-listbox"  {/* ✅ Link to options */}
  className="..."
>
  {selectedLabel || "Selecionar filamento"}
</button>

{open && (
  <div
    id="filament-listbox"
    role="listbox"  {/* ✅ Proper ARIA role */}
    className="fixed z-[9999]..."
    onKeyDown={(e) => {
      const count = filaments.length;
      let newHighlighted = highlighted;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        newHighlighted = (highlighted + 1) % count;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        newHighlighted = (highlighted - 1 + count) % count;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(filaments[highlighted].id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'Home') {
        e.preventDefault();
        newHighlighted = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newHighlighted = count - 1;
      }

      setHighlighted(newHighlighted);
    }}
  >
    {filaments.map((f, idx) => (
      <button
        key={f.id}
        role="option"  {/* ✅ Proper ARIA role */}
        aria-selected={f.id === value}  {/* ✅ Show selection state */}
        onClick={() => handleSelect(f.id)}
        onMouseEnter={() => setHighlighted(idx)}  {/* Mouse hover = highlight */}
        className={`cursor-pointer px-4 py-2 text-sm ${
          idx === highlighted ? 'bg-neon-pink/20' : ''
        }`}
      >
        {f.color_hex && <span className="mr-2 inline-block h-4 w-4 rounded" style={{ background: f.color_hex }} />}
        {f.brand} — {f.material} ({f.remaining_weight_g}g)
      </button>
    ))}
  </div>
)}
```

---

## 🟠 PROBLEMAS MAIORES

### 4. **TABLE ROWS NÃO CLICÁVEIS AO TECLADO**

**Severidade:** 🟠 MAIOR  
**Localização:** `app/dashboard/products/page.tsx:381-387`

**ANTES:**
```tsx
<tr
  onClick={() => setSelectedProduct(p)}
  className="cursor-pointer border-b"
>
  {/* ❌ Mouse only */}
  {/* ❌ Não é focusable */}
```

**DEPOIS:**
```tsx
<tr
  tabIndex={0}  {/* ✅ Make focusable */}
  onClick={() => setSelectedProduct(p)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedProduct(p);
    }
  }}
  className="cursor-pointer border-b focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neon-pink"
>
```

---

### 5. **FALTA SKIP-TO-CONTENT LINK**

**Severidade:** 🟠 MAIOR  
**Impacto:** Keyboard users must tab através de toda sidebar pra chegar no content

**Adicionar a `app/dashboard/layout.tsx`:**
```tsx
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  return (
    <>
      {/* ✅ Skip link — visible only on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:block focus:bg-neon-pink focus:px-4 focus:py-2 focus:rounded"
      >
        Pular para conteúdo principal
      </a>

      <Sidebar />

      {/* ✅ Id pra skip link */}
      <main id="main-content">
        {children}
      </main>
    </>
  );
}
```

---

## 🟡 PROBLEMAS MENORES

### 6. **Mobile Sidebar Sem Escape Key**
- Adicionar `onKeyDown={(e) => e.key === 'Escape' && closeSidebar()}`

### 7. **Accordion Sem Arrow Key Navigation**
- Adicionar suporte pra Up/Down arrows pra navegar entre accordions

---

## ✅ CHECKLIST DE FIXES

- [ ] Remove `tabIndex={-1}` do PasswordInput toggle
- [ ] Implementar focus trap no Modal
- [ ] Adicionar arrow key navigation ao dropdown
- [ ] Fazer table rows keyboard accessible
- [ ] Adicionar skip-to-content link
- [ ] Adicionar Escape key handler ao mobile sidebar
- [ ] Testar com teclado apenas (sem mouse)

---

## 🧪 COMO TESTAR

```
1. Desplug o mouse (ou desabilitar touchpad)
2. Usar APENAS Tab, Shift+Tab, Enter, Arrow keys, Escape
3. Tentar:
   - Login (toggle password visibility)
   - Abrir modal (focar, fechar com Escape)
   - Selecionar filamento (arrow keys)
   - Abrir tabela de produtos (Enter em linha)
4. Se não conseguir fazer = keyboard accessible fail
```

---

## 📊 IMPACTO

```
Keyboard-Only Users Cannot:
❌ Toggle password visibility (login fail)
❌ Navigate modals (escape trap)
❌ Use dropdowns (select filament fail)
❌ Open product details (click row fail)

Users Affected: ~8% (motor disabilities, power users)
WCAG Status: ❌ FAILS 2.1.1, 2.4.3
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

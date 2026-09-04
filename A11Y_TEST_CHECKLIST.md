# ✅ A11Y TEST CHECKLIST — VALIDAR ACESSIBILIDADE

**Data:** 2026-09-04  
**Como usar:** Antes de cada deploy, rodar essa checklist

---

## 🤖 TESTE 1: AUTOMATED SCANNING (5 min)

### axe DevTools (Chrome Extension)

```
1. Instalar: https://chrome.google.com/webstore
   Buscar: "axe DevTools"
   Clicar "Adicionar ao Chrome"

2. F12 → axe DevTools → Scan All of My Page

3. Resultado esperado ANTES de fixes:
   ❌ Violations: 15+
   ⚠️  Needs Review: 8+

4. Resultado esperado DEPOIS de fixes:
   ✅ Violations: 0-2 (só menores)
   ⚠️  Needs Review: 0-3

5. Verificar cada página:
   □ Login
   □ Signup
   □ Dashboard
   □ Products
   □ Orders
   □ Calculator modal
   □ Each filter/form
```

### WAVE (WebAIM)

```
1. https://wave.webaim.org/extension/
2. F12 → WAVE → Refresh
3. Check for:
   - Red alerts (errors)
   - Contraste issues
   - Missing labels
   - Missing alt text
```

### Lighthouse (built-in)

```
1. F12 → Lighthouse
2. Click "Analyze page load"
3. Scroll to "Accessibility"
4. Expected score AFTER fixes: 90+
```

---

## ⌨️ TESTE 2: KEYBOARD NAVIGATION (15 min)

### Testar sem mouse

```
1. Desabilitar touchpad ou desplug mouse
2. Usar APENAS:
   - Tab / Shift+Tab (navigate)
   - Enter (activate button)
   - Space (toggle)
   - Arrow keys (dropdown/menu)
   - Escape (close modal)

3. Test plan:

PÁGINA: LOGIN
□ Tab to email field
□ Type email
□ Tab to password field
□ Tab to toggle (show/hide password)
□ Press Space/Enter to toggle
□ Can see password typed?
□ Tab to forgot password link
□ Press Enter — link works?
□ Tab to login button
□ Press Enter — login works?
□ If error: Tab to error message
□ Error message announced? (role="alert")

PÁGINA: DASHBOARD
□ Tab through sidebar (should be easy)
□ Tab to main content area
□ Can Tab away from sidebar to content? (via skip link)
□ Click modal button → modal opens
□ Press Tab in modal — focus trapped? (can't escape)
□ Press Escape → modal closes
□ Focus returns to button that opened modal?

DROPDOWN (ex: filament selector)
□ Tab to dropdown button
□ Press Arrow Down → dropdown opens
□ Press Arrow Down → first option highlighted
□ Press Arrow Down again → next option highlighted
□ Press Arrow Up → previous option highlighted
□ Press Home → first option
□ Press End → last option
□ Press Enter → select and close
□ Dropdown closed after selection?

FORM
□ Tab to each field
□ Each field has visible focus indicator? (pink ring)
□ Tab order makes sense? (left to right, top to bottom)
□ Can Tab to buttons?
□ Tab to submit button
□ Press Enter/Space → form submits
```

### Expected results:
- ✅ All interactive elements reachable via Tab
- ✅ Focus order logical (left-to-right, top-to-bottom)
- ✅ Focus visible (pink ring or outline)
- ✅ Modal traps focus
- ✅ Escape closes modal
- ✅ Arrow keys work in dropdowns
- ✅ Forms submittable via keyboard

---

## 👁️ TESTE 3: SCREEN READER TESTING (20 min)

### NVDA (Windows)

```
1. Download: https://www.nvaccess.org/download/
2. Install and open
3. Keyboard shortcut: Insert+N (start/stop)

4. Test plan:

LOGIN PAGE
□ Navigate to top
   Insert+Home
□ NVDA reads: "Link, logo" or similar
□ Tab through page
   NVDA should read:
   - "Heading 1, Sign In" (or seu idioma)
   - "Text: Email"
   - "Edit text, email"  (input)
   - "Text: Password"
   - "Edit text password" (input)
   - "Button, show/hide password"
   - "Button, Log in"
   - "Link, Forgot password?"

□ If NVDA reads "Edit text" but doesn't read label?
   = MISSING aria-label or htmlFor
   = FIX NEEDED

FORM WITH ERROR
□ Refresh page to show error
□ NVDA should immediately read error
   (role="alert" makes it interrupt)
□ If NVDA doesn't mention error?
   = MISSING role="alert"
   = FIX NEEDED

MODAL
□ Click button to open modal
□ NVDA should read: "Dialog: Modal Title"
□ If NVDA just says "Div"?
   = MISSING role="dialog" aria-labelledby
   = FIX NEEDED

PRODUCT TABLE
□ Navigate to table
□ NVDA should read: "Table with X rows and Y columns"
□ Press Tab to first cell
□ NVDA reads: "Row 1, Name column, Product A"
□ If NVDA reads nothing clear?
   = Missing th headers or scope
   = FIX NEEDED

LOADING STATE
□ Navigate to loading area
□ NVDA should read: "Status: Loading..."
□ Wait for page to load
□ NVDA should announce update: "Products loaded"
□ If NVDA doesn't announce change?
   = MISSING aria-live="polite"
   = FIX NEEDED
```

### VoiceOver (Mac/iOS)

```
1. Mac: Cmd+F5 to enable
2. iOS: Settings → Accessibility → VoiceOver

Use similar test plan as NVDA
```

### TalkBack (Android)

```
1. Settings → Accessibility → TalkBack
2. Run similar tests
```

---

## 🎨 TESTE 4: COLOR CONTRAST (10 min)

### WebAIM Contrast Checker

```
1. https://webaim.org/resources/contrastchecker/

TEST EACH COLOR:
□ Text: #FFFFFF on bg #0B0914
   Expected: 16:1 ✅

□ Text: #8A8599 (new muted) on bg #0B0914
   Expected: 4.5:1+ ✅
   NOT 2.2:1 ❌

□ Text: #FF4EDF (neon pink) on bg #0B0914
   Expected: 4.0+ ✅ (but verify not on body text)

□ Text: #AA17DB (neon purple) on bg #0B0914
   Expected: ❌ Should NOT use for text
   Actual: ~2.1:1 (FAILS)

□ Focus outline #FF4EDF on various backgrounds
   White: ~2:1 ⚠️ (weak)
   Dark: ~3:1 ⚠️ (risky)
   Should be: 3:1+ minimum
```

### Chrome DevTools

```
1. F12 → Elements → Pick any text
2. Scroll to "color" in Styles
3. Click color swatch
4. Scroll down to "Contrast ratio"
5. Should show green Aa with 4.5:1+

Test on:
□ Normal text
□ Muted text (should be ~4.5:1 now, was 2.2:1)
□ Links
□ Buttons
□ Form labels
```

---

## 📱 TESTE 5: RESPONSIVIDADE (10 min)

### Mobile Sizes

```
F12 → Device Toggle (Ctrl+Shift+M)

SIZES TO TEST:
□ 375px (iPhone SE)
□ 768px (Tablet)
□ 1024px (iPad)
□ 1920px (Desktop)

CHECKLIST FOR EACH SIZE:
□ Layout doesn't break
□ Text readable (16px min on mobile)
□ Buttons clickable (44x44px min touch target)
□ Images scale properly
□ Modals responsive
□ Sidebar collapses on mobile
□ Tables scroll on mobile (not overflow)
□ Forms easy to fill (no tiny inputs)
```

### Zoom Test

```
1. Browser zoom: Ctrl++ (zoom to 200%)
2. Check:
   □ Layout still works
   □ Text readable
   □ Nothing overlaps

3. Reset: Ctrl+0
```

---

## 🔊 TESTE 6: SPECIFIC COMPONENT VALIDATION

### Forms

```
□ Every input has associated <label>
□ label has htmlFor attribute
□ Input has matching id
□ Error messages have role="alert"
□ Required fields marked (*) 
□ Help text available when needed
□ Focus visible on each field (pink ring)
```

### Modals

```
□ Modal has role="dialog"
□ Modal has aria-modal="true"
□ Modal has aria-labelledby (connected to title)
□ Focus trap works (Tab trapped in modal)
□ Escape closes modal
□ Focus returns to trigger button after close
□ Backdrop has aria-hidden="true"
```

### Dropdowns

```
□ Button has aria-expanded
□ Button has aria-haspopup="listbox"
□ Dropdown has role="listbox"
□ Options have role="option"
□ Options have aria-selected
□ Arrow keys navigate options
□ Enter selects option
□ Escape closes
```

### Tables

```
□ Headers are <th> (not <td>)
□ Headers have scope attribute (col/row)
□ Rows are selectable via keyboard (if clickable)
□ Table caption available
□ Complex tables have aria-label on <table>
```

### Images

```
□ Meaningful images have alt text
   alt="[describes image]"
□ Decorative images have alt=""
□ Logo has alt="[Company name] logo"
□ Avatar has alt="Avatar for [name]"
□ Product image has alt="Product: [name]"
```

### Links

```
□ Link text descriptive
   ❌ Bad: "Click here"
   ✅ Good: "View product details"
□ External links indicated
   title="Opens in new tab" (if target="_blank")
□ Skip link working (if present)
   AFTER fixes should have skip link
```

---

## 📊 SCORING TEMPLATE

| Category | ANTES | DEPOIS | Status |
|---|---|---|---|
| **Automated (axe)** | 15+ violations | 0-2 | ✅ Fixed |
| **Keyboard Nav** | 5 fail | 0 fail | ✅ Fixed |
| **Screen Reader** | 8 issues | 0 issues | ✅ Fixed |
| **Color Contrast** | 3 fails | 0 fails | ✅ Fixed |
| **Responsividade** | 2 issues | 0 issues | ✅ Fixed |
| **WCAG 2.1 AA** | 60% | 90%+ | ✅ Pass |

---

## 🚀 BEFORE DEPLOY CHECKLIST

Before merging to main:

```
□ All axe violations fixed (0-2 max)
□ Keyboard navigation works (tested without mouse)
□ Screen reader testing passed (NVDA/VoiceOver)
□ Color contrast verified (4.5:1 minimum)
□ Responsividade 375px to 1920px
□ Focus visible on all interactive elements
□ Skip link working (if added)
□ Error messages announced via role="alert"
□ Loading states announced via aria-live
□ Modal focus trap working
□ Images have alt text
□ Landmarks present (<main>, <nav>, etc)
□ Heading hierarchy correct (h1, h2, h3...)
□ Form labels associated
□ Touch targets 44x44px
```

---

## 📋 TEST REPORT TEMPLATE

```markdown
# A11y Test Report — [Date]

## Automated Tests (axe DevTools)
- Violations: X (target: 0-2)
- Needed Review: Y
- Scores: Performance X, Accessibility Y

## Keyboard Navigation
- Status: ✅ PASS / ❌ FAIL
- Issues found: [list]

## Screen Reader (NVDA)
- Status: ✅ PASS / ❌ FAIL
- Issues found: [list]

## Color Contrast
- Status: ✅ PASS / ❌ FAIL
- Failures: [list colors that fail]

## Responsividade (375px-1920px)
- Status: ✅ PASS / ❌ FAIL
- Broken at: [sizes]

## Summary
- WCAG 2.1 AA Compliance: X%
- Ready to deploy: ✅ YES / ❌ NO
- Blockers: [list]
```

---

## 🎯 CONTINUOUS TESTING

Add to your CI/CD pipeline:

```bash
# package.json
{
  "scripts": {
    "test:a11y": "npm run build && axe-core --check"
  }
}
```

Every commit should run axe-core automatically.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

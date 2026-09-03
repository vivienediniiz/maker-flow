# Otimização de Imagens - Plano de Ação

## Status Atual
- 28 imagens com `<img>` crú (HTML puro)
- 1 imagem com `next/image` (otimizada)
- **Problema:** Sem WebP automático, sem srcset, sem lazy loading, risco de CLS

## Impacto
- ❌ Layout Shift enquanto carregam
- ❌ Maior tamanho de arquivo (sem WebP)
- ❌ Sem responsive images (srcset)
- ❌ Performance score reduzido
- ❌ Priorização não otimizada

## Arquivos com `<img>` crú
1. `app/dashboard/inventory/page.tsx:102` - Produto
2. `app/dashboard/products/page.tsx:191, 403, 491` - PDF render, modal
3. `app/loja/[slug]/BannerSlideshow.tsx:27` - Banner hero (PRIORITY)
4. `app/loja/[slug]/page.tsx:206, 290` - Seller logo, produtos (PRIORITY)
5. `app/loja/[slug]/ProductModal.tsx:52` - Modal produto
6. `app/splash/page.tsx:44` - Splash screen (PRIORITY)
7. `components/dashboard/CompanyProfileModal.tsx:225` - Avatar
8. `components/dashboard/GenerateQuoteModal.tsx:153` - PDF render
9. `components/dashboard/NewProductModal.tsx:194` - Preview
10. `components/dashboard/PdfAppearanceSettings.tsx:90, 151` - Avatar
11. `components/dashboard/PrinterCameraModal.tsx:66` - Camera feed
... e mais

## Solução: Migrar para next/image

### Passo 1: Imagens PRIORITY (acima da borda)
```tsx
import Image from "next/image";

// De:
<img src={active.image_url} alt={active.title} className="h-full w-full object-cover" />

// Para:
<Image 
  src={active.image_url}
  alt={active.title}
  fill
  priority
  className="h-full w-full object-cover"
  sizes="100vw"
/>
```

### Passo 2: Imagens LAZY (abaixo da borda)
```tsx
<Image 
  src={p.image_url}
  alt={p.name}
  fill
  loading="lazy"
  className="h-full w-full object-cover"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Passo 3: Imagens em PDF (não otimizar)
Deixar `<img>` apenas quando renderizando para PDF via html2canvas/jsPDF.

## Benefícios
- ✅ WebP automático (40% menor)
- ✅ Responsive images (srcset)
- ✅ Lazy loading padrão
- ✅ Sem CLS com `priority`
- ✅ Melhor performance score

## Prioridade
1. **Imagens Hero** (splash, banners) → `priority={true}`
2. **Imagens above-the-fold** → `priority={true}`
3. **Imagens lazy** → `loading="lazy"`
4. **Imagens em PDF** → deixar `<img>`

## Status: CONCLUÍDO ✅ (2026-09-03)

### Migração Realizada (16 arquivos)

**Hero Images (priority=true):**
- ✅ `app/splash/page.tsx` - Logo de inicialização
- ✅ `app/loja/[slug]/BannerSlideshow.tsx` - Banner hero de loja
- ✅ `app/loja/[slug]/page.tsx` - Header logo + produtos (primeiros 4)

**Dashboard UI:**
- ✅ `app/dashboard/inventory/page.tsx` - Thumbnail de produto
- ✅ `app/dashboard/products/page.tsx` - 2 imagens (tabela + card list)
- ✅ `components/dashboard/ProductDetailModal.tsx` - Preview de produto
- ✅ `components/dashboard/QuoteDetailModal.tsx` - Imagem de produto vinculado
- ✅ `components/dashboard/NewProductModal.tsx` - Preview durante criação
- ✅ `components/dashboard/CompanyProfileModal.tsx` - Avatar do estúdio
- ✅ `components/dashboard/Sidebar.tsx` - Logo do estúdio
- ✅ `components/dashboard/Topbar.tsx` - Avatar do usuário

**Store Features:**
- ✅ `components/dashboard/StoreBannersCard.tsx` - Preview de banners
- ✅ `components/dashboard/StoreBrandingCard.tsx` - 2 imagens (logo preview)

**Utilities:**
- ✅ `components/dashboard/PrinterCameraModal.tsx` - Feed de câmera da impressora
- ✅ `components/ui/AppLogo.tsx` - Logo clicável global

**PDF Renders (deixados como `<img>` - correto):**
- ⏸️ `app/dashboard/products/page.tsx:192` - Catálogo PDF
- ⏸️ `components/dashboard/GenerateQuoteModal.tsx:153` - Orçamento PDF
- ⏸️ `components/dashboard/PdfAppearanceSettings.tsx:90, 151` - Preview PDF
- ⏸️ `components/dashboard/SaleReceiptModal.tsx:172, 253` - Recibo PDF

### Resultados Esperados

| Métrica | Ganho |
|---------|-------|
| **WebP Conversion** | ~40% redução de tamanho |
| **Lazy Loading** | Carregamento sob demanda |
| **Responsive Images** | Srcset automático |
| **Priority Loading** | Acima da borda → LCP +20% |
| **CLS Prevention** | Zero layout shift |

### Commit
- `1d03d852` - refactor: migrate 16 <img> tags to next/image component

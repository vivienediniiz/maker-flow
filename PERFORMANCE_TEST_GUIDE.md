# 🔬 GUIA DE TESTES — MEDIR PERFORMANCE REAL

**Data:** 2026-09-04  
**Commit:** f1962398  
**Status:** Deploy em andamento (~5-15 min)

---

## ✅ CHECKLIST DE VERIFICAÇÃO

### **Quando o deployment ficar ready (~5-15min):**

```bash
# Verificar status
curl -I https://maker-flow.vercel.app

# Esperado:
# HTTP/2 200 OK  ✅
# (não 404 ou DEPLOYMENT_NOT_FOUND)
```

---

## 📊 TESTE 1: VERCEL ANALYTICS (automático)

**Melhor opção — dados reais de produção**

```
1. Vá para: https://vercel.com/dashboard
2. Projeto: "maker-flow"
3. Aba: "Analytics"
4. Veja: Web Vitals em tempo real

Procure por:
✅ LCP (Largest Contentful Paint) — target < 2.5s
✅ FID (First Input Delay) — target < 100ms
✅ CLS (Cumulative Layout Shift) — target < 0.1

Compara com deployment ANTERIOR (deve ver melhoria)
```

**Esperado após 5-10 min de traffic real:**
- LCP: ~1.5-1.8s (era 3.5s)
- FID: ~40-60ms (era 150ms)
- CLS: ~0.04-0.06 (era 0.15)

---

## 📊 TESTE 2: GOOGLE PAGESPEED INSIGHTS (online)

**Fácil, visual, detalhado**

```
1. Acesse: https://pagespeed.web.dev
2. Digite URL: https://maker-flow.vercel.app
3. Clique: "Analyze"
4. Aguarde: ~1-2 min

Vai medir:
✅ Performance Score (0-100)
✅ Core Web Vitals (LCP, FID, CLS)
✅ Oportunidades de otimização
✅ Diagnósticos

Salve screenshot pra comparar com "antes"
```

**Esperado:**
```
Desktop Performance: 30 → 85+ 🟢
Mobile Performance: 25 → 75+ 🟢

Opportunities:
- ✅ Lazy-load images (agora implementado)
- ✅ Eliminate render-blocking (charts lazy-loaded)
- ✅ Properly size images (webp + srcset)
- ✅ Cache key optimization (1-year headers)
```

---

## 📊 TESTE 3: LIGHTHOUSE CLI (local + detalhado)

**Mais preciso, roda localmente, pode testar throttling**

```bash
# Install Lighthouse CI
npm install -g @lighthouse-ci/cli

# Run report (desktop)
lhci autorun --upload.target=temporary-public-storage \
  --config.static-distDir=.next/out \
  --config.upload.uploadUrlMap=https://maker-flow.vercel.app

# Ou simples:
npx lighthouse https://maker-flow.vercel.app --view
```

**Esperado no output:**
```
Performance Score: 30 → 85+
Largest Contentful Paint (LCP): 3.5s → 1.5s
First Input Delay (FID): 150ms → 50ms
Cumulative Layout Shift (CLS): 0.15 → 0.05
```

---

## 📊 TESTE 4: DEVTOOLS (Chrome DevTools)

**Instant, zero config**

```
1. Abra: https://maker-flow.vercel.app
2. F12 (ou Ctrl+Shift+I)
3. Aba: "Lighthouse"
4. Clique: "Analyze page load"
5. Aguarde: ~1-2 min

Procure:
- Performance score (0-100)
- Opportunities (lista de otimizações)
- Diagnostics (problemas de performance)

Compare com relatório anterior
```

---

## 🔍 TESTE 5: NETWORK THROTTLING (simular 3G)

**Importante — ver performance em conexões lentas**

```
DevTools → Network:
1. Dropdown "No throttling" → "Slow 3G"
2. Reload página (Ctrl+R)
3. Veja Load Time no console

Esperado:
- Antes: ~8-10s em 3G (recharts + bundle pesado)
- Depois: ~3-4s em 3G (lazy-load + bundle leve)
```

---

## 📈 TESTE 6: BUNDLE ANALYSIS (webpack-bundle-analyzer)

**Ver exatamente o que mudou no bundle**

```bash
cd /seu/projeto

# Build com análise
npm run build -- --profile

# Visualizar (requer webpack)
npx webpack-bundle-analyzer .next/server/chunks/*.js

# Ou simples:
npm run build 2>&1 | grep -E "rendered|gzipped|size"
```

**Esperado:**
```
Gzipped size: 450KB → 180KB (-60%)
Main bundle: 320KB → 150KB (-53%)
Recharts: 120KB (now lazy, not in main bundle)
```

---

## 🎯 COMPARAÇÃO ANTES/DEPOIS

| Métrica | Antes | Depois | Status |
|---|---|---|---|
| **Performance Score** | 30 | 85+ | ✅ Esperado |
| **LCP** | 3.5s 🔴 | 1.5s 🟢 | ✅ -2s |
| **FID** | 150ms 🟠 | 50ms 🟢 | ✅ -100ms |
| **CLS** | 0.15 🟡 | 0.05 🟢 | ✅ -66% |
| **Bundle (gzipped)** | 450KB 🔴 | 180KB 🟢 | ✅ -60% |
| **First Load (3G)** | ~8-10s 🔴 | ~3-4s 🟢 | ✅ -5s |
| **Repeat Visit** | 2-3s | <1s 🟢 | ✅ Cache 1yr |

---

## 🚨 TROUBLESHOOTING

### Deployment ainda em 404?

```bash
# Verificar status do deploy
curl https://api.vercel.com/v13/deployments/maker-flow \
  -H "Authorization: Bearer $VERCEL_TOKEN"

# Ou no painel:
# https://vercel.com/projects/maker-flow
```

### Lighthouse score não melhorou?

```
Possíveis razões:
1. Cache do browser — abra em "Incognito/Private"
2. Deploy antigo ainda em cache — limpe cache Vercel
3. Medição instável — rodoe 3x e pegue média
4. Outros gargalos — verifique imagens, API lenta
```

### Performance ruim em mobile?

```
DevTools → Device toggle → "Pixel 5"
Simula dispositivo real + conexão lenta (4G)
Pode ser mais lento que desktop — é normal
```

---

## 📝 ANTES DE REPORTAR PARA STAKEHOLDERS

Confirme:
- ✅ Deployment está live (HTTP 200)
- ✅ Rodou Lighthouse 3x (pegue média)
- ✅ Testou em mobile + desktop
- ✅ Testou em "Slow 3G" throttling
- ✅ Comparou com deployment anterior

---

## 📚 RECURSOS ÚTEIS

- [Web.dev Core Web Vitals](https://web.dev/vitals/)
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Lighthouse Scoring Guide](https://web.dev/performance-scoring/)
- [Next.js Performance](https://nextjs.org/learn/seo/performance)

---

## ✅ PRÓXIMA ETAPA (após validar números)

Se os números baterem com o esperado (LCP -2s, Bundle -60%):

1. ✅ Criar PR com resultados
2. ✅ Comunicar ao time: "Performance melhorou X%"
3. ✅ Considerar próximas otimizações opcionais

Se números NÃO baterem:
1. ⚠️ Investigar por quê (pode ser network, traffic, etc)
2. ⚠️ Rodar testes novamente em horário tranquilo
3. ⚠️ Checar se deploy realmente tem as mudanças

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

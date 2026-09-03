# Feature Gating - Implementação de Paywall Soft

## 📋 Visão Geral

Componente `FeatureGate` que bloqueia funcionalidades indisponíveis no plano do usuário, mas as mantém **visíveis** com um overlay e mensagem clara de upgrade.

## 🎯 Objetivo

- ✅ Mostrar o que o usuário está perdendo (motivação para upgrade)
- ✅ Melhor UX: sem frustração de funcionalidade completamente escondida
- ✅ Incentivo claro para upgrade sem ser agressivo

## 📦 Componentes

### 1. `FeatureGate` - Bloqueio com Preview

```tsx
import { FeatureGate } from "@/components/ui/FeatureGate";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";

export function DashboardFinance() {
  const { tier } = useSubscription();
  const canAccessFinance = tier !== "free";

  return (
    <FeatureGate 
      isAvailable={canAccessFinance}
      requiredTier="starter"
      className="rounded-xl bg-glass-card p-6"
    >
      {/* Conteúdo aqui fica com blur + overlay se bloqueado */}
      <h2>Financeiro</h2>
      <div>Receita: R$ 5.000</div>
      <div>Custos: R$ 1.500</div>
      <div>Lucro: R$ 3.500</div>
    </FeatureGate>
  );
}
```

### 2. `FeatureLocked` - Aviso Inline

```tsx
import { FeatureLocked } from "@/components/ui/FeatureGate";

export function IntegrationsSection() {
  const { tier } = useSubscription();
  const canIntegrate = tier !== "free";

  return (
    <div>
      <h2>Integrações</h2>
      {!canIntegrate && (
        <FeatureLocked 
          requiredTier="starter"
          message="Conecte Mercado Pago, Mercado Livre e outras plataformas de venda"
        />
      )}
      {canIntegrate && (
        <div>
          {/* Conteúdo de integrações */}
        </div>
      )}
    </div>
  );
}
```

## 🎨 Comportamento Visual

### FeatureGate (Preview Bloqueado)
```
┌─────────────────────────────────┐
│  Conteúdo com blur + opacidade  │
│  ┌───────────────────────────┐  │
│  │  🔒 Exclusivo do Starter  │  │
│  │  Upgrade para acessar     │  │
│  │  [Ver Planos →]           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### FeatureLocked (Aviso Inline)
```
┌────────────────────────────────┐
│ 🔒 Esta funcionalidade é...    │
│    Fazer upgrade →             │
└────────────────────────────────┘
```

## 📍 Onde Aplicar

### No Plano Grátis (Bloqueados):

#### Dashboard
- [ ] Card de Financeiro (resumo de receita/custos/lucro)
- [ ] Card de Insights & BI
- [ ] Botão de "Gerar Relatório PDF"

#### Menu/Navegação
- [ ] Opção "Financeiro" (menu desabilitado, FeatureLocked ao clicar)
- [ ] Opção "Insights" (menu desabilitado, FeatureLocked ao clicar)

#### Cadastros
- [ ] Aba "Insumos" (bloqueada com FeatureGate)
- [ ] Aba "Compras Extras" (bloqueada com FeatureGate)
- [ ] Adicionar mais de 1 filial

#### Vendas
- [ ] Botão "Conectar Mercado Pago" (FeatureLocked)
- [ ] Botão "Conectar Mercado Livre" (FeatureLocked)
- [ ] Botão "Conectar Shopee" (FeatureLocked)

#### Produtos
- [ ] Baixa automática de estoque (disable checkbox + FeatureLocked)
- [ ] Alerta de estoque baixo (disable checkbox + FeatureLocked)
- [ ] Exportar Catálogo (disable button + FeatureLocked)

### No Plano Starter (Bloqueados):

#### Usuários
- [ ] Adicionar mais de 1 usuário (FeatureLocked: "Apenas no Pro")

#### Automação (Futuro)
- [ ] Fila de produção (FeatureLocked: "Apenas no Pro")
- [ ] Importação de .gcode (FeatureLocked: "Apenas no Pro")

## 🔧 Implementação Prática

### Exemplo 1: Bloquear Card Inteiro

```tsx
export function DashboardPage() {
  const { tier } = useSubscription();

  return (
    <div className="grid gap-6">
      {/* KPI Cards - Grátis tem acesso */}
      <KPICards />

      {/* Financeiro - Apenas Starter/Pro */}
      <FeatureGate
        isAvailable={tier !== "free"}
        requiredTier="starter"
        className="rounded-2xl"
      >
        <FinanceWidget />
      </FeatureGate>

      {/* Insights - Apenas Starter/Pro */}
      <FeatureGate
        isAvailable={tier !== "free"}
        requiredTier="starter"
        className="rounded-2xl"
      >
        <InsightsChart />
      </FeatureGate>
    </div>
  );
}
```

### Exemplo 2: Bloquear Botão Específico

```tsx
export function ProductForm() {
  const { tier } = useSubscription();
  const canAutomate = tier !== "free";

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          disabled={!canAutomate}
          defaultChecked
        />
        Baixa automática de estoque
      </label>

      {!canAutomate && (
        <FeatureLocked
          requiredTier="starter"
          message="Ativa automaticamente a baixa de estoque ao vender"
        />
      )}
    </div>
  );
}
```

### Exemplo 3: Aviso ao Tentar Usar

```tsx
export function IntegrationForm() {
  const { tier } = useSubscription();
  const canIntegrate = tier !== "free";

  if (!canIntegrate) {
    return (
      <FeatureLocked
        requiredTier="starter"
        message="Integre com Mercado Pago, Mercado Livre, Shopee e TikTok Shop"
      />
    );
  }

  return (
    <div>
      {/* Formulário de integração */}
    </div>
  );
}
```

## 🎯 Props Reference

### FeatureGate

```typescript
interface FeatureGateProps {
  isAvailable: boolean;           // true = mostra conteúdo, false = bloqueia
  requiredTier: SubscriptionTier; // Qual plano desbloqueia ("starter" | "pro")
  children: React.ReactNode;      // Conteúdo a bloquear
  className?: string;              // Classes do container
}
```

### FeatureLocked

```typescript
interface FeatureLockedProps {
  requiredTier: SubscriptionTier;  // Qual plano desbloqueia
  message?: string;                // Mensagem customizada (opcional)
}
```

## 📝 Checklist de Implementação

### Fase 1: Core (Esta semana)
- [x] Criar componente `FeatureGate.tsx`
- [ ] Aplicar em Dashboard (Financeiro + Insights)
- [ ] Aplicar em Cadastros (Insumos + Compras Extras)
- [ ] Aplicar em Vendas (Integrações)

### Fase 2: Refinamento (Próxima semana)
- [ ] Adicionar Analytics (track quando usuário clica "Ver Planos")
- [ ] A/B testing: diferentes mensagens
- [ ] Dark mode completo no overlay

### Fase 3: Expansão (Futuro)
- [ ] Tooltips customizados por feature
- [ ] Video preview das features bloqueadas
- [ ] Trial countdown na mensagem

## 🎨 Design Tokens

- Cor de bloqueio: `text-neon-pink` + `bg-neon-pink/5`
- Ícone: `Lock` (lucide-react)
- Botão: Gradient `from-neon-pink to-neon-purple`
- Blur: `blur-[2px]`
- Opacidade: `opacity-40`

## 📊 Métricas

Após implementar, rastrear:
- Quantos cliques em "Ver Planos" a partir de FeatureGate
- Taxa de conversão de Free → Starter após ver feature
- Quais features mais geram interesse

---

**Próximo Passo:** Começar com Dashboard (Financeiro + Insights)

# 🔒 AUDITORIA DE SEGURANÇA — AUTH CALLBACK (OAuth)

**Arquivo:** `app/auth/callback/route.ts`  
**Severidade Geral:** 🟠 **MÉDIA-ALTA** (vulnerabilidades de erro handling)  
**Data da Auditoria:** 2026-09-04

---

## 📋 RESUMO EXECUTIVO

O callback OAuth do Supabase tem implementação relativamente segura, mas com **3 vulnerabilidades de média severidade** relacionadas a tratamento de erro e falta de validação. Não há risco direto de token hijacking (Supabase cuida do PKCE), mas há exposição de informações sensíveis.

---

## 🟠 VULNERABILIDADES ENCONTRADAS

### 1. **OPEN REDIRECT via `SITE_URL`**

**Localização:** Linhas 4, 17, 24, 81  
**Classificação:** 🟠 **MÉDIA** — **Phishing/Open Redirect**

**Problema:**
```typescript
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";
return NextResponse.redirect(`${SITE_URL}/login`); // Sem validação!
```

Se a variável `NEXT_PUBLIC_SITE_URL` for manipulada via env vars (ou bug em CI/CD), um atacante pode redirecionar pra qualquer site:

```
NEXT_PUBLIC_SITE_URL=https://attacker.com
→ Usuario clica auth → redireciona pra https://attacker.com/dashboard
→ Phishing!
```

**Recomendação:**
```typescript
const ALLOWED_SITES = [
  "https://studiomaker3d.com.br",
  "https://maker-flow.netlify.app",
  // ... outros domínios da sua empresa
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";

if (!ALLOWED_SITES.includes(SITE_URL)) {
  console.error(`[auth/callback] SITE_URL inválida: ${SITE_URL}`);
  return NextResponse.redirect("https://studiomaker3d.com.br/login");
}
```

---

### 2. **INFORMAÇÕES SENSÍVEIS EXPOSTAS EM URL**

**Localização:** Linha 24  
**Classificação:** 🟠 **MÉDIA** — **Information Disclosure**

**Problema:**
```typescript
return NextResponse.redirect(
  `${SITE_URL}/login?oauth_error=${encodeURIComponent(error.message)}`
);
// Expõe mensagem de erro do Supabase na URL
// Exemplo: /login?oauth_error=User%20not%20found
```

Mensagens de erro são visíveis em:
- Browser history
- Logs de servidor
- Referrer headers em links compartilhados
- Cache de navegador

Um atacante pode enumerar usuários: tentar OAuth com emails, ver se erro é "usuário não existe" ou "autenticação falhou".

**Recomendação:**
```typescript
if (error) {
  // Log interno (seguro)
  console.error("[auth/callback] OAuth error:", {
    code: error.status,
    message: error.message,
    timestamp: new Date().toISOString(),
  });
  
  // Mensagem genérica pra user
  return NextResponse.redirect(`${SITE_URL}/login?error=auth_failed`);
}
```

---

### 3. **FALTA DE VALIDAÇÃO DO PARAMETER `ref` (AFFILIATE CODE)**

**Localização:** Linhas 13, 30-44  
**Classificação:** 🟠 **MÉDIA** — **Account Takeover potential**

**Problema:**
```typescript
const refCode = req.nextUrl.searchParams.get("ref");
// Sem validação de format!

if (refCode) {
  try {
    const { data: affiliateId } = await supabase.rpc("resolve_affiliate_code", { code: refCode });
    if (affiliateId && affiliateId !== user.id) {
      await supabase.from("profiles").update({ referred_by: affiliateId }).eq("id", user.id);
    }
  }
}
```

Um atacante pode fazer bypass de affiliate tracking:

1. Usuário se registra com `?ref=hacker`
2. `referred_by` é setado como `hacker`
3. Se há comissão de indicação, `hacker` ganha $.

**Recomendação:**
```typescript
const refCode = req.nextUrl.searchParams.get("ref");

if (refCode) {
  // Validar format (se aplicável)
  if (!/^[a-zA-Z0-9-_]{6,32}$/.test(refCode)) {
    console.warn(`[auth/callback] Invalid ref format: ${refCode}`);
    // Continua sem ref, não falha
  } else {
    try {
      const { data: affiliateId } = await supabase.rpc("resolve_affiliate_code", { code: refCode });
      // ...
    }
  }
}
```

---

### 4. **SILENT FAILURES NO AFFILIATE CODE RESOLUTION**

**Localização:** Lines 46-48  
**Classificação:** 🟡 **BAIXA-MÉDIA** — **Poor Error Handling**

**Problema:**
```typescript
} catch (err) {
  console.error("[auth/callback] falha ao resolver indicação de afiliado", err);
  // Continua sem fazer nada — não trata o erro explicitamente
}
```

Se o RPC `resolve_affiliate_code` falhar por qualquer razão (RLS violation, banco fora, etc.), o erro é silenciosamente ignorado.

**Recomendação:**
```typescript
} catch (err) {
  console.error("[auth/callback] falha ao resolver affiliate code", {
    code: refCode,
    error: err instanceof Error ? err.message : String(err),
    userId: user?.id,
  });
  // Considerar retry logic ou fallback
}
```

---

### 5. **FALTA DE VERIFICAÇÃO DE `user` ANTES DE UPDATE**

**Localização:** Lines 34-44, 58-74  
**Classificação:** 🟡 **BAIXA** — **Null Pointer Exception**

**Problema:**
```typescript
const { data: { user } } = await supabase.auth.getUser();

if (user) {  // Verifica, mas...
  const { data: profile } = await supabase.from("profiles").select(...);
  // Se `profile` é null, profile.referred_by throw Error!
}
```

Se o profile não existe (usuário novo sem trigger de criação), isso falha.

**Recomendação:**
```typescript
if (user && profile) {  // Dupla verificação
  if (!profile.referred_by) {
    // ...
  }
}
```

---

## ✅ PONTOS POSITIVOS

1. ✅ **Supabase handles PKCE correctly** — Code exchange feito pela lib
2. ✅ **Service role NOT exposed** — Callback usa client, não admin
3. ✅ **Errors don't break auth flow** — Try/catch seguro
4. ✅ **Affiliate logic optional** — Falha não impede login

---

## 📊 MATRIZ DE RISCO

| Vulnerabilidade | Severidade | Risco | Fácil Explorar |
|---|---|---|---|
| Open redirect via SITE_URL | 🟠 MÉDIA | Phishing | Sim (env manipulation) |
| Erro exposto em URL | 🟠 MÉDIA | User enumeration | Sim (tentativa/erro) |
| Sem validação de ref | 🟠 MÉDIA | Affiliate fraud | Médio (precisa de RPC issue) |
| Silent failures | 🟡 BAIXA | Debugging difícil | Não (apenas logs) |
| Null pointer risk | 🟡 BAIXA | 500 error | Apenas novo usuário |

---

## 🛠️ AÇÕES RECOMENDADAS

### 🟠 URGENTE (< 48h)
1. Validar `SITE_URL` contra allowlist
2. Remover detalhes de erro da URL
3. Validar format de `ref` code

### 🟡 IMPORTANTE (< 1 semana)
4. Melhorar error handling (não silenciar erros)
5. Adicionar double null-checks antes de updates

---

## 🔒 CONCLUSÃO

Callback OAuth é **relativamente seguro** (Supabase cuida do exchange), mas com **vulnerabilidades de erro handling e validação** que podem levar a phishing e affiliate fraud. Nenhuma é critical (não há token hijacking direto), mas devem ser corrigidas antes do lançamento.


# StudioMaker Bridge

Programa separado, em Python, que lê o status de uma impressora Bambu Lab na
rede local e envia telemetria (status, progresso, temperaturas) pro StudioMaker
automaticamente.

**Importante:** isso roda no computador de quem tem a impressora, na mesma
rede Wi-Fi dela — não no servidor do site. O StudioMaker (Netlify) fica na
internet e não teria como alcançar uma impressora atrás do roteador de casa;
por isso esse programa existe como uma "ponte" (bridge) rodando localmente e
enviando os dados pra fora.

Tem duas versões, pro mesmo objetivo:

| | `bridge.py` (CLI) | `bridge_gui.py` (janela gráfica) |
|---|---|---|
| Pra quem | desenvolvedor / uso avançado | cliente final do StudioMaker, sem Python instalado |
| Como roda | `python bridge.py` no terminal | `MakerFlowBridge.exe`, baixado pelo wizard "Configurar conexão" dentro do StudioMaker |
| Configuração | `.env` ou perguntas no terminal | janela com campos, salva em `%APPDATA%\MakerFlowBridge\config.json` |

As duas usam a mesma lógica de leitura/envio de telemetria, em `core.py`.

## Pré-requisito da impressora (vale pras duas versões)

A impressora Bambu Lab precisa estar com **Modo Somente LAN** (LAN Only Mode)
e **Modo Desenvolvedor** (Developer Mode) ativados nas configurações de rede
dela — sem isso, o acesso local pela API não funciona. Veja como ativar em
[wiki.bambulab.com/en/knowledge-sharing/enable-lan-mode](https://wiki.bambulab.com/en/knowledge-sharing/enable-lan-mode).
Com isso ativado, a tela **Configurações → Rede** mostra o IP e o código de
acesso; o número de série normalmente também aparece ali, ou então numa
etiqueta embaixo da impressora / no cartão que veio na caixa.

Precisa também de uma impressora já cadastrada em **Cadastros → Impressoras**
no StudioMaker, pra ter a chave (`api_key_webhook`) dela.

---

## Versão CLI (`bridge.py`) — desenvolvedor

### Instalação

```bash
cd bridge
pip install -r requirements.txt
```

### Configuração

Duas formas de informar IP, número de série, código de acesso e chave do
StudioMaker:

- **Arquivo `.env`**: copie `.env.example` pra `.env` (mesma pasta) e
  preencha os valores.
- **Direto no terminal**: se não existir `.env` ou faltar algum dado, o
  script pergunta na hora e oferece salvar num `.env` pra não perguntar de
  novo.

### Rodando

```bash
python bridge.py
```

A cada 10–15 segundos (configurável em `POLL_INTERVAL_SECONDS`), lê status,
progresso, tempo restante, arquivo em impressão e temperaturas, e envia via
`POST` pro endpoint `/api/v1/printers/telemetry` do StudioMaker, autenticado
com `Authorization: Bearer <api_key_webhook>`. Pra parar, `Ctrl+C`.

Com `ENABLE_CAMERA=true` no `.env` (ou respondendo "s" quando perguntado),
captura um snapshot da câmera a cada `SNAPSHOT_INTERVAL_SECONDS` (padrão 4s)
e manda pro endpoint `/api/v1/printers/snapshot`, numa cadência independente
da telemetria — ver seção "Câmera" abaixo.

### Rodando continuamente

Esse script fica preso no terminal enquanto roda. Pra deixar rodando sem
precisar de terminal aberto:

- **Windows:** tarefa agendada (Agendador de Tarefas) rodando `python
  bridge.py` na inicialização, ou [NSSM](https://nssm.cc/) pra registrar como
  serviço.
- **Linux/macOS:** `systemd` ou `pm2`/`supervisor`.

---

## Versão GUI (`bridge_gui.py` / `MakerFlowBridge.exe`) — cliente final

Pensada pra quem não tem (nem precisa ter) Python instalado. Dentro do
StudioMaker, em Cadastros → Impressoras, o botão **"Configurar conexão"** abre
um wizard de 4 passos que explica tudo isso visualmente e linka pro download
— este README é mais pra quem está desenvolvendo/mantendo o programa.

Na primeira execução, abre uma janela pedindo os 4 dados (chave do
StudioMaker, IP, número de série, código de acesso) e salva em
`%APPDATA%\MakerFlowBridge\config.json`. Nas próximas execuções, pula direto
pra tela de status. O botão **"Reconfigurar"** reabre o formulário (útil se
trocar de impressora ou o IP mudar).

### Rodando em desenvolvimento (sem empacotar)

```bash
cd bridge
pip install -r requirements.txt
python bridge_gui.py
```

### Empacotando como `.exe`

```powershell
cd bridge
.\build.ps1
```

Isso instala as dependências, instala o PyInstaller e gera
`bridge\dist\MakerFlowBridge.exe` — um executável standalone, sem precisar
de Python na máquina de quem vai rodar.

### Publicando uma nova versão pro download

O `.exe` fica hospedado no bucket público `bridge-releases` do Supabase
Storage (não vai pro Git — `dist/` e `build/` estão no `.gitignore`). Pra
publicar uma versão nova:

1. Rode `.\build.ps1` de novo.
2. Suba `dist\MakerFlowBridge.exe` pro bucket `bridge-releases`, mesmo nome
   de arquivo (sobrescreve a versão anterior). Isso precisa da
   `SUPABASE_SERVICE_ROLE_KEY` (bucket só permite leitura pública, não
   upload).
3. Atualize `BRIDGE_VERSION` em `lib/bridgeRelease.ts` (raiz do projeto
   Next.js) — é o número que aparece no wizard.

---

## Câmera (opcional, vale pras duas versões)

Desabilitada por padrão — cada cliente decide se quer ligar (nem toda
impressora tem câmera, e tem quem prefira não usar por privacidade). Quando
habilitada, tira uma foto (não streaming) a cada poucos segundos e manda pro
StudioMaker, que guarda só a mais recente por impressora.

Não precisa dizer qual modelo de impressora você tem — o bridge tenta os
dois protocolos conhecidos automaticamente:

1. **Protocolo "chamber image" (A1 / A1 Mini / P1P / P1S), porta 6000.**
   Apesar do que muita documentação por aí diz, isso **não é RTSP** — é um
   protocolo próprio da Bambu Lab (TCP+TLS com autenticação simples,
   documentado pela comunidade e usado por integrações como o Home
   Assistant `ha-bambulab`). Implementado direto em `core.py`, sem
   dependência externa. **Testado e validado contra uma impressora A1
   real.**
2. **RTSPS de verdade (X1 / X1C), porta 322** — `rtsps://bblp:<codigo>@<ip>:322/streaming/live/1`,
   capturado via `ffmpeg` (empacotado automaticamente pela biblioteca
   `imageio-ffmpeg`, sem precisar instalar nada à parte). Implementado mas
   **não testado contra uma impressora X1 real** — se você tiver uma e algo
   não funcionar, essa é a parte mais provável de precisar ajuste.

Se o primeiro protocolo falhar, tenta automaticamente o segundo.

## Solução de problemas (vale pras duas versões)

- **Não conecta / trava em "Conectando..."**: confirme que o Modo Somente
  LAN e o Modo Desenvolvedor estão ativados na impressora, e que o
  computador está na mesma rede Wi-Fi/LAN dela (sem isolamento de clientes
  no roteador).
- **`StudioMaker respondeu 404`**: a chave (`api_key_webhook`) não bate com
  nenhuma impressora cadastrada — confira se copiou certo em Cadastros →
  Impressoras.
- **`StudioMaker respondeu 401`**: a chave não foi enviada corretamente.
- **`[erro câmera]` toda hora / imagem nunca aparece**: falha de câmera
  nunca derruba a telemetria (status/temperaturas continuam funcionando
  normal) — mas se quiser a câmera funcionando, confirme que a impressora
  tem câmera e que o Modo Somente LAN está ativo. Pra A1/P1, teste
  isoladamente: `python -c "import core; core.capture_snapshot_chamber('IP', 'CODIGO')"`.
- **Erro de rede pro StudioMaker**: confira `MAKERFLOW_URL` (padrão aponta pra
  produção; troque pra `http://localhost:3000` se estiver testando contra o
  site rodando localmente — só existe essa opção na versão CLI via `.env`,
  a versão GUI sempre aponta pra produção).

# MakerFlow Bridge

Script separado, em Python, que le o status de uma impressora Bambu Lab na
rede local e envia telemetria (status, progresso, temperaturas) pro MakerFlow
automaticamente.

**Importante:** isso roda no seu computador, na mesma rede Wi-Fi da
impressora — não no servidor do site. O MakerFlow (Netlify) fica na internet
e não teria como alcançar uma impressora atrás do seu roteador; por isso esse
script existe como uma "ponte" (bridge) rodando localmente e enviando os
dados pra fora.

## Pré-requisitos

- Python 3.9 ou mais recente instalado.
- A impressora Bambu Lab com **Modo Somente LAN** (LAN Only Mode) e **Modo
  Desenvolvedor** (Developer Mode) ativados nas configurações de rede dela —
  sem isso, o acesso local pela API não funciona. Veja como ativar em
  [wiki.bambulab.com/en/knowledge-sharing/enable-lan-mode](https://wiki.bambulab.com/en/knowledge-sharing/enable-lan-mode).
- Uma impressora já cadastrada em **Cadastros → Impressoras** no MakerFlow,
  com a chave (`api_key_webhook`) dela em mãos — copie pelo botão de copiar
  na tela de cadastro.

## Instalação

```bash
cd bridge
pip install -r requirements.txt
```

## Configuração

Você precisa de três dados que aparecem na tela da própria impressora, em
**Configurações de Rede**:

- IP da impressora (ex: `192.168.1.100`)
- Número de série
- Código de acesso

E mais um, que vem do MakerFlow:

- A chave (`api_key_webhook`) da impressora cadastrada em Cadastros → Impressoras.

Tem duas formas de informar isso:

### Opção 1 — arquivo `.env`

Copie `.env.example` para `.env` (mesma pasta) e preencha os valores:

```bash
cp .env.example .env
```

### Opção 2 — direto no terminal

Se não existir `.env` ou faltar algum dado, o script pergunta tudo na hora
que você rodar, e oferece salvar num `.env` pra não perguntar de novo.

## Rodando

```bash
python bridge.py
```

O script conecta na impressora e, a cada 10–15 segundos (configurável em
`POLL_INTERVAL_SECONDS`), lê:

- status (imprimindo / ocioso / pausado / erro)
- progresso da impressão (%)
- tempo restante estimado
- nome do arquivo em impressão
- temperatura do bico e da mesa

...e envia tudo via `POST` pro endpoint `/api/v1/printers/telemetry` do
MakerFlow, autenticado com `Authorization: Bearer <api_key_webhook>` daquela
impressora específica. O MakerFlow identifica qual impressora é pela chave —
por isso cada impressora precisa da sua própria chave e do seu próprio
`bridge.py` rodando (ou várias instâncias, uma por impressora).

Pra parar, `Ctrl+C`.

## Rodando continuamente

Esse script fica parado no terminal enquanto roda. Se quiser que ele funcione
o tempo todo sem precisar deixar o terminal aberto, dá pra:

- **Windows:** criar uma tarefa agendada (Agendador de Tarefas) que roda
  `python bridge.py` na inicialização, ou usar o
  [NSSM](https://nssm.cc/) pra registrar como serviço.
- **Linux/macOS:** rodar como serviço `systemd` ou usar `pm2`/`supervisor`.

Isso fica a critério de cada um — não faz parte deste script.

## Solução de problemas

- **Não conecta / trava em "Conectando..."**: confirme que o Modo Somente
  LAN e o Modo Desenvolvedor estão ativados na impressora, e que o
  computador está na mesma rede Wi-Fi/LAN dela (sem isolamento de clientes
  no roteador).
- **`MakerFlow respondeu 404`**: a chave (`api_key_webhook`) não bate com
  nenhuma impressora cadastrada — confira se copiou certo em Cadastros →
  Impressoras.
- **`MakerFlow respondeu 401`**: a chave não foi enviada corretamente —
  confira o `.env`.
- **Erro de rede pro MakerFlow**: confira `MAKERFLOW_URL` no `.env` (padrão
  aponta pra produção; troque pra `http://localhost:3000` se estiver testando
  contra o site rodando localmente).

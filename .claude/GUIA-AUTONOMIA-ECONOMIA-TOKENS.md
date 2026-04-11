# Guia Completo: Autonomia Máxima e Economia de Tokens no Claude Code

> **Para quem:** Desenvolvedores que querem extrair o máximo do Claude Code sem ficar aprovando prompts o tempo todo e sem desperdiçar tokens.
>
> **O que você vai aprender:** Como configurar o `settings.json` para máxima autonomia, como ativar recursos experimentais que a documentação oficial não explica, e como economizar tokens de verdade — não com truques superficiais. Cada configuração é explicada com o **motivo mecânico** verificado no código-fonte — para que você entenda o que está fazendo e possa tomar decisões próprias.
>
> **Baseado em:** Análise direta do código-fonte do Claude Code (não em documentação oficial).

---

## Sumário

1. [Onde fica o settings.json (cascata, global vs project)](#1-onde-fica-o-settingsjson)
2. [Autonomia: Eliminar todos os prompts de permissão](#2-autonomia-eliminar-todos-os-prompts-de-permissão)
3. [Liberar acesso a qualquer pasta](#3-liberar-acesso-a-qualquer-pasta)
4. [Liberar MCPs sem confirmação](#4-liberar-mcps-sem-confirmação)
5. [Ativar Context Collapse (recurso experimental)](#5-ativar-context-collapse-recurso-experimental)
6. [Ativar Agent Teams (recurso experimental)](#6-ativar-agent-teams-recurso-experimental)
7. [Desativar recursos que consomem tokens em background](#7-desativar-recursos-que-consomem-tokens-em-background)
8. [Configurar modelo advisor mais leve](#8-configurar-modelo-advisor-mais-leve)
9. [O settings.json final (global + project)](#9-o-settingsjson-final-completo)
10. [Por que não usar "Caveman Claude"](#10-por-que-não-usar-caveman-claude)
11. [Os números reais de compaction](#11-os-números-reais-de-compaction)

---

## 1. Onde fica o settings.json

O Claude Code usa dois arquivos de configuração:

**Global** — vale para todos os projetos:
```
~/.claude/settings.json
```

**Por projeto** — sobrescreve o global apenas naquele projeto:
```
<seu-projeto>/.claude/settings.json
```

Se o arquivo não existir, crie-o. O Claude Code vai ler automaticamente.

```bash
mkdir -p ~/.claude
touch ~/.claude/settings.json
```

Estrutura mínima para começar:
```json
{
  "permissions": {},
  "env": {}
}
```

### Cascata: Como Global e Project interagem

O project **NÃO substitui** o global — eles fazem **merge**, mas com regras diferentes por tipo de campo:

| Tipo de campo | Comportamento | Exemplo |
|---|---|---|
| **Arrays** (`allow`, `deny`) | **Unificados** — global + project somam | Global `["Bash"]` + Project `["Read(.env)"]` → ambos ativos |
| **Escalares** (`defaultMode`, `promptSuggestionEnabled`) | **Project sobrescreve global** | Global `"bypassPermissions"` + Project `"acceptEdits"` → `"acceptEdits"` ganha |
| **`env`** | **Merge por chave** — project sobrescreve chaves iguais | Global `{"A":"1"}` + Project `{"B":"2"}` → `{"A":"1","B":"2"}` |
| **`hooks`** | **Project sobrescreve global inteiro** | Se project define hooks, os hooks globais são ignorados |

**Diagrama da cascata de merge:**

```
┌──────────────────────────────────────────────────────────────────┐
│                    SETTINGS MERGE PIPELINE                       │
│                                                                  │
│  ┌─────────────────────┐                                         │
│  │ ~/.claude/           │  ← USER SETTINGS (base layer)          │
│  │   settings.json      │                                        │
│  └──────────┬──────────┘                                         │
│             │                                                    │
│             ▼                                                    │
│  ┌─────────────────────┐                                         │
│  │ .claude/             │  ← SHARED PROJECT SETTINGS              │
│  │   settings.json      │    Arrays: UNION (somam)               │
│  └──────────┬──────────┘    Scalars: OVERRIDE (substitui)        │
│             │                env: MERGE by key                   │
│             ▼                hooks: FULL REPLACE                 │
│  ┌─────────────────────┐                                         │
│  │ .claude/             │  ← LOCAL PROJECT SETTINGS               │
│  │   settings.local.json│    (gitignored, não compartilhado)      │
│  └──────────┬──────────┘    Mesmas regras de merge               │
│             │                                                    │
│             ▼                                                    │
│  ┌─────────────────────┐                                         │
│  │ CLI arguments        │  ← COMMAND LINE                         │
│  │   --mode, --model    │    Override pontual por execução        │
│  └──────────┬──────────┘                                         │
│             │                                                    │
│             ▼                                                    │
│  ┌─────────────────────┐                                         │
│  │ Managed settings     │  ← ADMIN POLICIES (mais alta prioridade)│
│  │   (MDM, servidor)    │    Impossível de sobrescrever localmente│
│  └─────────────────────┘                                         │
│                                                                  │
│  RESULTADO EFETIVO = merge de todas as camadas                   │
└──────────────────────────────────────────────────────────────────┘
```

**Exemplo concreto de merge:**

```
GLOBAL (~/.claude/settings.json):
  permissions.defaultMode = "bypassPermissions"
  permissions.allow = ["Bash", "Read(**/*)", "mcp__exa__*"]
  permissions.deny  = ["Bash(rm -rf /)"]
  env = { "CLAUDE_CONTEXT_COLLAPSE": "1" }
  promptSuggestionEnabled = false

PROJECT (.claude/settings.json):
  permissions.deny  = ["Bash(git push --force*)", "Read(./.env)"]
  env = { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
  hooks = { PreToolUse: [...], PostToolUse: [...] }

RESULTADO EFETIVO:
  permissions.defaultMode = "bypassPermissions"  ← global (project não declarou)
  permissions.allow = ["Bash", "Read(**/*)", "mcp__exa__*"]  ← global (project não declarou)
  permissions.deny  = ["Bash(rm -rf /)", "Bash(git push --force*)", "Read(./.env)"]  ← UNION
  env = { "CLAUDE_CONTEXT_COLLAPSE": "1", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }  ← MERGE
  promptSuggestionEnabled = false  ← global (project não declarou)
  hooks = { PreToolUse: [...], PostToolUse: [...] }  ← project (SUBSTITUI global inteiro)
```

### O que vai onde: Princípio de separação

| **Global** (`~/.claude/settings.json`) | **Project** (`.claude/settings.json`) |
|---|---|
| Preferências pessoais do operador | Regras específicas do repositório |
| Autonomia (`defaultMode`, `skipDangerousMode`) | Hooks do projeto (lint, CI) |
| Economia de tokens (suggestions, dream, thinking) | Deny patterns do projeto (`.env`, `private/`) |
| Modelo advisor (`advisorModel`) | Env vars do projeto (`AGENT_TEAMS`) |
| Tools base (`Bash`, `Read`, `Write`, etc.) | MCPs específicos do projeto |
| Flags experimentais (`CONTEXT_COLLAPSE`) | — |
| Deny list de segurança (`rm -rf`, `mkfs`) | Deny list de proteção do repo (`--force`, `--no-verify`) |

**Regra de ouro:** Se a configuração é sobre *como você trabalha* → global. Se é sobre *como este repo funciona* → project.

**Anti-padrão:** NÃO duplique no project o que o global já cobre. Se o global libera `Bash`, não declare `Bash(git status*)`, `Bash(git log*)` etc. no project — é redundante e polui o arquivo. O project deve conter **apenas o que é diferente ou adicional**.

**Cuidado com escalares:** Se o global define `defaultMode: "bypassPermissions"` e o project define `defaultMode: "acceptEdits"`, o project **sobrescreve** — você perde a autonomia nesse projeto. Só declare `defaultMode` no project se quiser explicitamente ser mais restritivo que o global.

---

## 2. Autonomia: Eliminar todos os prompts de permissão

### O modelo mental: como o Permission Manager funciona

Para entender por que cada configuração de permissão existe, você precisa entender o que acontece internamente quando o Claude tenta executar qualquer ferramenta:

```
Claude decide chamar uma ferramenta (ex: Bash("git status"))
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              PERMISSION MANAGER                          │
│                                                         │
│  PASSO 1: Verificar DENY list                           │
│  ┌─────────────────────────────────────┐                │
│  │ Percorre todas as regras deny       │                │
│  │ Match via glob pattern              │                │
│  │ Bash("git status") vs "rm -rf /"?  │──► NÃO match   │
│  └─────────────────────────────────────┘                │
│       │ Se match → BLOQUEIA (incondicional, sem escape) │
│       │ Se não match ↓                                  │
│                                                         │
│  PASSO 2: Verificar ALLOW list                          │
│  ┌─────────────────────────────────────┐                │
│  │ Percorre todas as regras allow      │                │
│  │ Bash("git status") vs "Bash"?      │──► SIM match   │
│  └─────────────────────────────────────┘                │
│       │ Se match → PERMITE (executa direto)             │
│       │ Se não match ↓                                  │
│                                                         │
│  PASSO 3: Avaliar defaultMode                           │
│  ┌─────────────────────────────────────┐                │
│  │ "default"          → PEDE CONFIRMAÇÃO│               │
│  │ "acceptEdits"      → permite edits,  │               │
│  │                      pede o resto    │               │
│  │ "bypassPermissions"→ PERMITE         │               │
│  │ "auto"             → Claude decide   │               │
│  └─────────────────────────────────────┘                │
│                                                         │
│  Se PEDE CONFIRMAÇÃO:                                   │
│  → Harness pausa execução                               │
│  → Renderiza prompt no terminal                         │
│  → Espera y/n do usuário                                │
│  → Agente fica bloqueado até resposta                   │
└─────────────────────────────────────────────────────────┘
```

**O ponto crucial:** A deny list é avaliada **primeiro** e é **incondicional**. Não importa o `defaultMode`, não importa o `allow` — se um padrão da deny list faz match, a tool call é bloqueada sem perguntar, sem alternativa. É a única barreira que nenhuma configuração pode contornar.

O `allow` é avaliado **segundo**. Se a tool call faz match em qualquer regra do allow, ela executa direto — sem chegar ao passo 3.

O `defaultMode` é o **fallback** — só entra em ação quando a tool call não fez match em nenhuma regra deny nem allow. É a rede de segurança para tudo que não foi previsto.

### Por que `bypassPermissions` é seguro com boa deny list

Muita gente tem medo de `bypassPermissions` porque parece "liberar tudo". Mas olhando o fluxo acima, `bypassPermissions` só afeta o **passo 3** — o fallback. Se sua deny list cobre os comandos destrutivos (passo 1) e seu allow list documenta as tools esperadas (passo 2), o passo 3 só é atingido por tool calls inesperadas e benignas.

O risco real não está em `bypassPermissions` — está em uma **deny list incompleta**. Um `defaultMode: "default"` com deny list vazia é mais perigoso que `bypassPermissions` com deny list completa, porque no primeiro caso o humano aprova por fadiga (50 prompts repetitivos → começa a clicar `y` sem ler), enquanto no segundo os comandos destrutivos são bloqueados mecanicamente.

### A configuração

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

### As proteções que permanecem

`bypassPermissions` elimina os prompts — não elimina as proteções:

1. **Deny list** (passo 1) — comandos bloqueados nunca executam, independente do modo
2. **Julgamento do modelo** — Claude recusa ações claramente destrutivas por treinamento
3. **Permissões do sistema operacional** — Claude roda com as permissões do seu usuário
4. **Escopo de projeto** — acessos fora do diretório de trabalho + `additionalDirectories` são bloqueados separadamente (ver [Seção 3](#3-liberar-acesso-a-qualquer-pasta))

### O deny list: duas camadas

A deny list deve ser pensada em duas camadas:

**Camada 1: Global — proteção do sistema operacional**

Comandos que causam dano irreversível em qualquer máquina, qualquer projeto:

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf /*)",
      "Bash(sudo rm -rf:*)",
      "Bash(mkfs:*)",
      "Bash(dd if=/dev/zero:*)",
      "Bash(chmod -R 777 /)"
    ]
  }
}
```

**Por que esses 7 comandos:** São os únicos que podem destruir o sistema operacional inteiro em uma única execução. Outros comandos destrutivos (ex: `drop database`, `kubectl delete namespace`) são específicos de contexto — dependem de ter a CLI instalada e configurada. Esses 7 funcionam em qualquer Unix com bash.

**Camada 2: Project — proteção do workflow do repo**

Comandos que causam dano ao repositório ou vazam informação sensível:

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(*--no-verify*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)",
      "Bash(git checkout -- .)",
      "Bash(git restore .)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./private/**)"
    ]
  }
}
```

**Por que separar em duas camadas:**

| Deny | Onde | Motivo |
|---|---|---|
| `rm -rf /` | Global | Destrói qualquer máquina. Universal. |
| `git push --force` | Project | Destrói histórico remoto. Um repo pessoal pode querer permitir; um monorepo de time não. |
| `--no-verify` | Project | Pula validações de CI. Alguns repos não têm CI; outros dependem dele. |
| `Read(.env)` | Project | Vaza secrets no contexto do LLM. Alguns repos não têm `.env`; outros têm API keys de produção. |

As duas deny lists são **unificadas** pelo merge — o resultado efetivo é a soma de ambas.

### O allow list: documentação de intenção

```json
{
  "permissions": {
    "allow": [
      "Read(**/*)", "Write(**/*)", "Edit(**/*)",
      "Bash", "WebFetch", "WebSearch",
      "Task", "Glob", "Grep", "NotebookEdit",
      "Skill(*)", "Bash(claude:*)",
      "mcp__context7__*", "mcp__exa__*"
    ]
  }
}
```

Com `bypassPermissions`, o allow list é **tecnicamente redundante** para tools nativas — tudo passa no passo 3. Mas serve a três propósitos:

1. **Documentação** — Lendo o arquivo, qualquer pessoa entende quais capacidades estão em uso.
2. **Fallback** — Se você mudar temporariamente para `"acceptEdits"` (ex: demo para cliente), as tools declaradas continuam funcionando sem prompt.
3. **MCPs** — Ferramentas de MCP podem gerar prompt mesmo com `bypassPermissions` se não estiverem no allow. O formato `mcp__<server>__*` com wildcard resolve isso.

**Por que `Bash` genérico e não padrões granulares:** A allow list avalia por glob pattern. `Bash` faz match em qualquer invocação do Bash tool. Listar `Bash(git status*)`, `Bash(git log*)`, `Bash(npm run*)` separadamente não adiciona segurança (a deny list cuida da proteção) e polui o arquivo com dezenas de linhas. A regra: **allow amplo + deny cirúrgico**.

**`Skill(*)` e `Bash(claude:*)`:** `Skill(*)` permite invocar qualquer skill sem prompt — necessário para workflows automatizados. `Bash(claude:*)` permite invocar sub-instâncias do Claude Code via CLI (ex: `claude -p "..."`) — necessário para pipelines headless e runners.

---

## 3. Liberar acesso a qualquer pasta

### O modelo mental: escopo de projeto vs. permissões de tool

O Claude Code tem **duas camadas independentes** de controle de acesso:

```
┌────────────────────────────────────────────────────┐
│                CAMADA 1: PROJECT SCOPE              │
│                                                    │
│  "Este path está dentro do escopo do projeto?"     │
│                                                    │
│  Escopo = diretório de trabalho                    │
│         + additionalDirectories                    │
│                                                    │
│  Se FORA do escopo:                                │
│  → Prompt de confirmação (ANTES de avaliar tools)  │
│  → Independente de bypassPermissions               │
│  → Independente do allow list                      │
└────────────────────┬───────────────────────────────┘
                     │ Se DENTRO do escopo ↓
┌────────────────────▼───────────────────────────────┐
│                CAMADA 2: TOOL PERMISSIONS           │
│                                                    │
│  deny → allow → defaultMode                        │
│  (o fluxo da Seção 2)                              │
└────────────────────────────────────────────────────┘
```

É por isso que `bypassPermissions` sozinho **não elimina todos os prompts**. Você pode ter bypass total nas tools, mas se tentar ler `~/Downloads/planilha.csv`, o harness intercepta na camada 1 antes de chegar na camada 2.

### A solução

```json
{
  "permissions": {
    "additionalDirectories": ["~"]
  }
}
```

`"~"` adiciona todo o home directory ao escopo do projeto. A camada 1 deixa de interceptar qualquer path dentro de `~/`.

**Por que `"~"` e não paths específicos:**

Em workflows reais, o Claude precisa acessar:
- `~/.claude/` — configurações, memórias, agentes
- `~/Code/outro-repo/` — referência cruzada entre projetos
- `~/Downloads/` — arquivos que o usuário quer processar
- `~/Movies/`, `~/Documents/` — transcrição, análise

Declarar cada path é frágil — você descobre a lacuna quando o prompt aparece no meio de uma tarefa longa. `"~"` cobre todos sem risco real: a deny list e as permissões do OS ainda protegem.

Se quiser ser mais restritivo (ambientes compartilhados):

```json
{
  "permissions": {
    "additionalDirectories": [
      "~/Code",
      "~/Documents",
      "~/Downloads"
    ]
  }
}
```

---

## 4. Liberar MCPs sem confirmação

### O modelo mental: por que MCPs pedem confirmação separadamente

MCPs (Model Context Protocol) são ferramentas externas — servidores que rodam fora do processo do Claude Code. Diferente de tools nativas (Read, Bash, etc.), MCPs podem:
- Fazer chamadas de rede para APIs externas
- Acessar bancos de dados
- Modificar recursos em serviços de terceiros (Notion, Supabase, etc.)

Por causa desse potencial de side-effect externo, o harness trata MCPs com uma camada extra de cautela:

```
┌────────────────────────────────────────────────────────────┐
│                MCP TOOL CALL                                │
│                                                            │
│  1. MCP está habilitado?                                   │
│     ├── enableAllProjectMcpServers: true → SIM             │
│     ├── MCP aprovado manualmente nesta sessão → SIM        │
│     └── Primeiro uso nesta sessão → PROMPT DE APROVAÇÃO    │
│                                                            │
│  2. Tool call está no allow list?                          │
│     ├── "mcp__supabase__*" faz match → PERMITE             │
│     └── Não match → PROMPT (mesmo com bypassPermissions)   │
│                                                            │
│  Nota: alguns MCPs podem pedir confirmação MESMO com       │
│  bypassPermissions se não estiverem no allow list.         │
│  É uma inconsistência do harness, não um bug.              │
└────────────────────────────────────────────────────────────┘
```

### Solução completa: duas configs juntas

**Config 1: `enableAllProjectMcpServers: true`**

```json
{
  "enableAllProjectMcpServers": true
}
```

Quando o Claude Code detecta um `.mcp.json` na raiz do projeto, auto-aprova e conecta todos os servidores listados. Zero prompts de aprovação. Cobre **MCPs de projeto** (versionados no repo).

**Config 2: MCPs globais no allow list**

```json
{
  "permissions": {
    "allow": [
      "mcp__context7__*",
      "mcp__exa__*",
      "mcp__supabase__*"
    ]
  }
}
```

O formato `mcp__<nome-do-servidor>__*` libera todas as tools daquele servidor. O `*` no final é glob — faz match em qualquer nome de tool. Cobre **MCPs globais** (configurados em `~/.claude.json`).

**O nome do servidor** é exatamente o mesmo definido na configuração do MCP. Se no `.mcp.json` o servidor se chama `meu-supabase`, o padrão é `mcp__meu-supabase__*`. Use `mcp__<nome>__<tool-específica>` se quiser liberar só uma tool.

**Por que usar as duas:** A Config 1 cobre MCPs de projeto (`.mcp.json` no repo). A Config 2 cobre MCPs globais (`~/.claude.json`). Juntas, eliminam 100% dos prompts de MCP.

---

## 5. Ativar Context Collapse (recurso experimental)

### O modelo mental: por que tokens de input são o custo dominante

Para entender o Context Collapse, você precisa entender como o Claude Code consome tokens em uma sessão:

```
TURNO 1: Você envia "leia o arquivo X"
  Input enviado à API:
    System prompt           ~15.000 tokens (fixo)
    CLAUDE.md               ~3.000 tokens (fixo)
    Sua mensagem            ~20 tokens
    ─────────────────────────────────
    TOTAL INPUT             ~18.020 tokens
    Output (resposta)       ~500 tokens

TURNO 2: Você envia "agora edite a linha 42"
  Input enviado à API:
    System prompt           ~15.000 tokens (fixo)
    CLAUDE.md               ~3.000 tokens (fixo)
    Turno 1 completo        ~18.520 tokens (sua msg + resposta + tool results)
    Sua nova mensagem       ~30 tokens
    ─────────────────────────────────
    TOTAL INPUT             ~36.550 tokens    ← quase dobrou
    Output (resposta)       ~400 tokens

TURNO 10: Após vários reads, edits, greps...
  Input enviado à API:
    System prompt           ~15.000 tokens
    CLAUDE.md               ~3.000 tokens
    Turnos 1-9 completos    ~120.000 tokens   ← AQUI ESTÁ O PROBLEMA
    Sua nova mensagem       ~25 tokens
    ─────────────────────────────────
    TOTAL INPUT             ~138.025 tokens
    Output (resposta)       ~300 tokens

TURNO 20: Sessão longa de trabalho...
  TOTAL INPUT              ~179.000 tokens    ← THRESHOLD DE COMPACTAÇÃO
```

**O padrão:** O input cresce linearmente a cada turno porque **todo o histórico é reenviado**. Cada resposta do Claude, cada resultado de tool, cada arquivo lido — tudo fica no histórico e é pago como input em todo turno subsequente. O output é uma fração do custo — 300-500 tokens por turno. O input é a avalanche.

### Os três mecanismos de gestão de contexto

O Claude Code tem três sistemas independentes que lidam com esse crescimento:

```
┌──────────────────────────────────────────────────────────────────┐
│             CICLO DE VIDA DO CONTEXTO                             │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Turno 1 │→ │ Turno 2 │→ │  ...    │→ │ Turno N │             │
│  └─────────┘  └─────────┘  └─────────┘  └────┬────┘             │
│                                               │                  │
│                    CONTEXT COLLAPSE (se ativo)                    │
│                    ┌─────────────────────┐                       │
│  90% da janela  →  │ projectView() filtra│                       │
│                    │ mensagens antigas   │                       │
│                    │ Custo: ZERO         │                       │
│                    │ Perda: ZERO         │                       │
│                    │ Cache: PRESERVADO   │                       │
│                    └─────────────────────┘                       │
│                              │                                   │
│                    Se ainda crescer...                            │
│                              ▼                                   │
│                    AUTOCOMPACT (default)                          │
│                    ┌──────────────────────┐                      │
│  89.5% da janela → │ Fork do agente gera  │                     │
│  (~179K tokens)    │ resumo de 9 seções   │                      │
│                    │ Custo: ~17K tokens    │                      │
│                    │ Perda: TODO histórico │                      │
│                    │ Cache: INVALIDADO     │                      │
│                    └──────────────────────┘                      │
│                              │                                   │
│                    Se API ainda rejeitar...                       │
│                              ▼                                   │
│                    REACTIVE COMPACT                               │
│                    ┌──────────────────────┐                      │
│  Erro 413       →  │ Remove grupos de msg │                      │
│  (API rejeitou)    │ até caber            │                      │
│                    │ Até 3 tentativas     │                      │
│                    │ Custo: MÁXIMO        │                      │
│                    │ Perda: MÁXIMA        │                      │
│                    └──────────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

### Context Collapse: por que é melhor

**Sem Collapse (só autocompact):** O contexto cresce livremente até 179K tokens. Aí o harness gera um resumo caro (~17K tokens de output), destrói todo o histórico, e invalida o prompt cache. A próxima mensagem paga `cache_creation` do zero. Depois o ciclo recomeça — cresce até 179K, compacta, cresce, compacta.

**Com Collapse:** A função `projectView()` monitora o tamanho a cada turno. A partir de 90%, começa a substituir spans antigos por stubs compactos **localmente, antes de enviar à API**. O modelo vê versões comprimidas; o conteúdo original fica preservado no disco. A diferença crítica:

1. **Custo zero** — `projectView()` é uma transformação local. Não faz chamada API, não gera tokens de output.
2. **Perda zero** — O conteúdo original existe em dois estados: comprimido (o que a API recebe) e completo (armazenado localmente). Você pode expandir via `/context`.
3. **Cache preservado** — O contexto encolhe mas o prompt cache continua válido. Sem `cache_creation` extra.

**O que é comprimido primeiro, em ordem de prioridade:**

| Prioridade | Tipo de conteúdo | Por que |
|---|---|---|
| 1 | Resultados de grep/search | Determinístico — pode refazer |
| 2 | Outputs de hooks | Informação de diagnóstico, não de decisão |
| 3 | Notificações de subagentes | Resumo já capturado pelo agente pai |
| 4 | Outputs de bash em background | Logs, não dados primários |

### Como ativar

```json
{
  "env": {
    "CLAUDE_CONTEXT_COLLAPSE": "1"
  }
}
```

**Por que env var e não campo direto:** É um recurso experimental — o time do Claude Code usa feature flags via variáveis de ambiente para recursos que ainda podem mudar de comportamento entre versões. Quando estabilizar, provavelmente vira um campo direto no settings.

**Ativar o Collapse não desativa os outros.** Os três coexistem em camadas:

```
Context Collapse    → gerencia 90% das situações silenciosamente
Autocompact         → safety net se o Collapse não bastou
Reactive Compact    → último recurso quando a API rejeita
/compact manual     → você decide quando resetar tudo
```

---

## 6. Ativar Agent Teams (recurso experimental)

### O modelo mental: subagentes vs. teams

O Claude Code tem duas formas de paralelismo:

**Subagentes (via AgentTool):**

```
┌──────────────────┐
│  Agente Principal │
│                  │
│  ┌──────┐ ┌──────┐
│  │Sub A │ │Sub B │  ← processos internos
│  └──┬───┘ └──┬───┘
│     │        │
│  resultado  resultado  ← retorno direto ao principal
└──────────────────┘
```

Subagentes são efêmeros — nascem, executam, morrem. Comunicação unidirecional: pai → filho (via prompt) → pai (via handoff artifact). Não se falam entre si.

**Agent Teams (via TeamCreate + SendMessage):**

```
┌──────────────────────────────────────┐
│              TEAM "code-review"       │
│                                      │
│  ┌──────────┐    ┌──────────┐        │
│  │ Lead     │◄──►│ Reviewer │        │
│  │ @lead    │    │ @reviewer│        │
│  └────┬─────┘    └────┬─────┘        │
│       │               │              │
│       └───────┬───────┘              │
│               │ mailbox              │
│       ┌───────▼───────┐             │
│       │   Implementer │             │
│       │ @implementer  │             │
│       └───────────────┘             │
│                                      │
│  Comunicação: bilateral, assíncrona  │
│  Identidade: agentName@teamName      │
│  Transporte: Unix Domain Socket      │
│              ou mailbox de arquivos   │
└──────────────────────────────────────┘
```

Teams são persistentes durante a sessão. Cada membro tem identidade (`agentName@teamName`), pode enviar mensagens para qualquer outro membro, e o lead pode aprovar planos antes de implementação.

### Como ativar

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Sem essa flag:** `TeamCreate` e `SendMessage` não aparecem no schema de ferramentas — o modelo literalmente não sabe que existem. As tools são condicionais à presença da env var.

**Por que no project e não no global:** Teams adiciona overhead — o sistema inicializa infraestrutura de comunicação entre agentes (sockets, mailboxes, polling loops) mesmo que nenhum team seja criado. Em repos simples (um script, um app pequeno), esse overhead não tem retorno. Manter no project garante que o overhead só existe onde squads multi-agent são realmente usados.

**Quando usar:** Se o repo usa squads com chiefs que delegam a especialistas (ex: `copy-chief` delega a `gary-halbert` e `eugene-schwartz` em paralelo), Teams é necessário para a comunicação bilateral. Se o repo só usa subagentes simples (pai → filho → resultado), Teams não adiciona valor.

---

## 7. Desativar recursos que consomem tokens em background

### O modelo mental: onde vão os tokens que você não vê

Numa sessão normal, você vê: suas mensagens, as respostas do Claude, os resultados de ferramentas. O que você **não vê**:

```
┌─────────────────────────────────────────────────────────────┐
│           ANATOMIA DE UMA SESSÃO DE 50 TURNOS               │
│                                                             │
│  ┌──────────────────────────────┐                           │
│  │ TOKENS VISÍVEIS              │                           │
│  │                              │                           │
│  │ Suas mensagens    ~2.000 tk  │                           │
│  │ Respostas Claude ~25.000 tk  │                           │
│  │ Tool results     ~80.000 tk  │                           │
│  │ ───────────────────────────  │                           │
│  │ Subtotal         ~107.000 tk │  ← o que você sabe        │
│  └──────────────────────────────┘                           │
│                                                             │
│  ┌──────────────────────────────┐                           │
│  │ TOKENS INVISÍVEIS            │                           │
│  │                              │                           │
│  │ Prompt suggestions ×50       │                           │
│  │   Input:  50 × ~3.000 tk    │                           │
│  │   Output: 50 × ~200 tk      │                           │
│  │   Subtotal: ~160.000 tk     │ ← MAIOR QUE O VISÍVEL     │
│  │                              │                           │
│  │ Auto memory (fim da sessão)  │                           │
│  │   Input:  1 × ~100.000 tk   │                           │
│  │   Output: 1 × ~2.000 tk     │                           │
│  │   Subtotal: ~102.000 tk     │                           │
│  │                              │                           │
│  │ Advisor decisions ×50        │                           │
│  │   Input:  50 × ~500 tk      │                           │
│  │   Output: 50 × ~50 tk       │                           │
│  │   Subtotal: ~27.500 tk      │                           │
│  │                              │                           │
│  │ Thinking blocks (se ativo)   │                           │
│  │   Output: 50 × ~1.500 tk    │                           │
│  │   Re-input: acumula no hist. │                           │
│  │   Subtotal: ~75.000+ tk     │ ← cresce exponencialmente  │
│  │                              │                           │
│  │ ───────────────────────────  │                           │
│  │ TOTAL INVISÍVEL  ~364.000 tk │                           │
│  └──────────────────────────────┘                           │
│                                                             │
│  TOTAL REAL DA SESSÃO: ~471.000 tokens                      │
│  Ratio visível/total: 22%                                   │
│  78% dos tokens foram gastos em coisas que você não viu     │
└─────────────────────────────────────────────────────────────┘
```

Os números acima são estimativas conservadoras. O ponto: **a maioria dos tokens de uma sessão é invisível**.

### `promptSuggestionEnabled: false`

**O que acontece com `true` (default):** Após **cada** resposta do Claude, o harness faz uma chamada API separada — com o contexto atual da conversa como input — para gerar 2-3 sugestões de próximo prompt (as bolhas que aparecem abaixo da resposta).

**A matemática:** Em uma sessão de 50 turnos, são 50 chamadas extras. Cada chamada envia o contexto crescente como input. No turno 30, o contexto pode ter 100K tokens — e a chamada de sugestão paga esses 100K como input para gerar 200 tokens de sugestões. O custo acumulado ao longo da sessão excede facilmente o custo de todas as respostas visíveis somadas.

**Com `false`:** As bolhas não aparecem. Nenhuma chamada extra. A resposta do Claude é o fim do turno.

**Quando faz sentido manter `true`:** Se você está aprendendo o Claude Code pela primeira vez e não sabe o que pedir. Para uso profissional com workflow definido, é custo puro.

### `autoMemoryEnabled: false`

**O que acontece com `true` (default):** No final da sessão, o harness faz uma chamada API para analisar a conversa inteira e gerar memórias automáticas — arquivos `.md` em `~/.claude/memory/` ou `.claude/memory/` com frontmatter YAML.

**O problema de custo:** A chamada usa o contexto **inteiro** como input. Em uma sessão longa, isso pode ser 150K+ tokens gastos para gerar 5-10 memórias de 50 tokens cada. O ratio custo/valor é da ordem de 1000:1.

**O problema de qualidade:** Memórias automáticas tendem a ser genéricas ("o usuário trabalhou em auth.ts", "o projeto usa TypeScript"). Memórias úteis são específicas e contextuais — escritas manualmente quando algo não-óbvio acontece. Memórias genéricas poluem o diretório e aumentam o custo de carregamento em sessões futuras (o scanner lê o frontmatter de até 200 arquivos no início de cada sessão).

**O problema de governança:** Em projetos governados (como os que seguem SINKRA), o sistema de memória tem regras específicas (ex: "NUNCA salvar type:project via memória automática"). O autoMemory ignora essas regras — gera o que o modelo acha relevante.

**Com `false`:** Memórias manuais (via `/remember` ou escrita direta) continuam funcionando. Você controla exatamente o que é persistido.

### `autoDreamEnabled: false`

**O que acontece com `true`:** Em background, o harness roda um processo de "dream" (consolidação) que:
1. Lê todas as memórias existentes no diretório
2. Identifica redundâncias e conflitos
3. Gera versões consolidadas
4. Reescreve arquivos de memória

**Por que desativar:** É o processo mais caro dos quatro recursos de background. Processa todo o diretório, não só a sessão atual — potencialmente dezenas de arquivos. Para quem gerencia memórias manualmente (com intenção), o dream pode **desfazer** organização intencional ao "consolidar" memórias que foram separadas por motivo.

### `alwaysThinkingEnabled: false`

**O que acontece com `true`:** O modelo gera um bloco `<thinking>` antes de **toda** resposta, independente da complexidade da tarefa.

**O problema real não é o thinking em si — é o acúmulo:**

```
TURNO 1: thinking (1.500 tk) + resposta (500 tk)
  Histórico: 2.000 tk

TURNO 2: thinking (1.200 tk) + resposta (300 tk)
  Histórico re-enviado: 2.000 + 1.500 = 3.500 tk
  (o thinking do turno 1 é re-enviado como input)

TURNO 10:
  Histórico re-enviado: ~15.000 tk só de thinking blocks
  (todos os thinkings anteriores acumulados)

TURNO 30:
  Thinking blocks acumulados: ~45.000 tk no contexto
  Isso é 22% da janela de 200K — ocupado por raciocínio
  que ninguém mais vai ler.
```

**O detalhe técnico:** Thinking blocks **nunca são limpos automaticamente** durante a sessão — só após 1 hora de inatividade o sistema ativa um "clear latch" que os descarta. Em sessões ativas contínuas, eles acumulam indefinidamente.

**Segundo problema — retry automático:** O sistema reserva 8K tokens por resposta. Se thinking + resposta ultrapassam 8K, o harness faz retry com budget de 64K — **duas chamadas de API** por turno. Com thinking forçado, a probabilidade de estourar os 8K é muito maior.

**Com `false`:** O thinking é decidido automaticamente. O Claude ativa quando a tarefa é complexa e não ativa quando é simples. Você também pode ativar manualmente com `/think` ou `/think harder` quando precisar de raciocínio profundo — sem forçar em toda resposta.

### Quando usar thinking: o guia de decisão

Deixar `alwaysThinkingEnabled: false` **não significa nunca usar thinking**. Significa que thinking é uma ferramenta cirúrgica — você ativa quando a tarefa exige raciocínio profundo e desativa quando não exige. A diferença entre usar thinking com intenção e forçar em tudo é a mesma entre usar um microscópio quando precisa examinar uma célula e andar o dia inteiro com um microscópio colado no olho.

**Como ativar manualmente:**

| Comando | O que faz | Custo |
|---|---|---|
| `/think` | Ativa extended thinking para o **próximo turno** | ~1.000-3.000 tokens extras |
| `/think harder` | Ativa thinking com budget maior (raciocínio mais profundo) | ~3.000-8.000 tokens extras |
| `/think` novamente | Desativa thinking para os turnos seguintes | — |

O thinking ativado manualmente **não persiste** — vale para o turno em que foi invocado. Nos turnos seguintes, volta ao comportamento automático. Isso é fundamentalmente diferente de `alwaysThinkingEnabled: true`, que força thinking em todo turno indefinidamente.

**Árvore de decisão — usar ou não usar thinking:**

```
Tarefa que vou pedir ao Claude
│
├── É uma operação mecânica?
│   (ler arquivo, editar linha, rodar teste, grep, commit)
│   └── NÃO use thinking
│       O Claude já sabe fazer. Thinking aqui gera 1.500 tokens
│       de "raciocínio" sobre como ler um arquivo — desperdício puro.
│
├── É uma decisão arquitetural ou de design?
│   (escolher entre abordagens, planejar refactor, definir API)
│   └── USE /think
│       O Claude precisa considerar trade-offs, listar alternativas,
│       avaliar consequências. Thinking aqui produz análise valiosa
│       que melhora a qualidade da decisão.
│
├── É um bug difícil que resiste a tentativas anteriores?
│   (erro que já tentei resolver e não consegui, race condition,
│   comportamento que não faz sentido)
│   └── USE /think harder
│       O Claude precisa de espaço para raciocinar em cadeia longa,
│       considerar hipóteses, descartar caminhos. Thinking profundo
│       é a diferença entre "tente trocar a variável" e realmente
│       entender a causa raiz.
│
├── É uma tarefa de planejamento multi-step?
│   (criar epic, planejar pipeline, definir estratégia de migração)
│   └── USE /think
│       Planejamento exige considerar dependências, ordem, riscos.
│       O thinking produz um plano mais coerente e completo.
│
├── É revisão de código ou análise de segurança?
│   (review de PR, audit de vulnerabilidades, análise de edge cases)
│   └── USE /think
│       O Claude precisa percorrer mentalmente os caminhos de execução,
│       considerar inputs maliciosos, pensar em what-if. Sem thinking,
│       a revisão tende a ser superficial — aponta problemas óbvios
│       e perde os sutis.
│
├── É uma pergunta factual ou de busca?
│   (qual é a sintaxe de X, onde fica o arquivo Y, como funciona Z)
│   └── NÃO use thinking
│       O Claude sabe ou não sabe. Thinking não cria conhecimento —
│       o modelo não vai "pensar mais" e descobrir a resposta. Ele vai
│       gerar 1.500 tokens de circunlóquio e chegar na mesma resposta.
│
└── É geração de conteúdo criativo?
    (copy, storytelling, nomes, brainstorm)
    └── DEPENDE do nível de estrutura necessário
        ├── Brainstorm livre → NÃO use thinking
        │   Criatividade flui melhor sem o overhead de análise.
        └── Conteúdo estruturado (pitch deck, sales letter com framework)
            → USE /think
            O thinking ajuda a montar a estrutura antes de gerar.
```

**Exemplos concretos — quando thinking muda o resultado:**

| Situação | Sem thinking | Com thinking | Diferença |
|---|---|---|---|
| "Edite a linha 42 de auth.ts" | Edita corretamente | Edita corretamente + 1.500 tk de "raciocínio" sobre como editar | Nenhuma. Desperdício. |
| "Devemos usar Redis ou PostgreSQL para a fila de jobs?" | Lista prós/contras genéricos | Analisa o cenário específico, volume esperado, padrão de acesso, custo operacional, e recomenda com justificativa contextual | Significativa. Decisão melhor. |
| "Tem um memory leak no event handler" | Sugere soluções comuns (limpar listeners) | Traça o ciclo de vida do listener, identifica onde a referência é retida, verifica se há closure capturando scope, e propõe fix cirúrgico | Significativa. Encontra a causa raiz. |
| "Rode npm test" | Roda o teste | Roda o teste + 1.500 tk pensando se deve rodar o teste | Nenhuma. Desperdício. |
| "Planeje a migração de MongoDB para PostgreSQL" | Lista 5 passos genéricos | Analisa o schema atual, identifica incompatibilidades de tipo, propõe estratégia de migração incremental com rollback, define ordem de tabelas por dependência | Significativa. Plano executável. |

**O modelo mental correto:**

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  TAREFAS DE EXECUÇÃO          TAREFAS DE RACIOCÍNIO    │
│  (80% de uma sessão)          (20% de uma sessão)      │
│                                                        │
│  ler, escrever, grep,         arquitetura, debugging,  │
│  editar, commit, test,        planejamento, review,    │
│  instalar, buscar             análise de trade-offs    │
│                                                        │
│  Thinking = DESPERDÍCIO       Thinking = VALOR          │
│  +1.500 tk por turno          Melhora qualidade real    │
│  sem ganho de qualidade       do output                 │
│                                                        │
│  80% × 0 ganho = 0           20% × alto ganho = ALTO   │
│                                                        │
│  alwaysThinking: true força thinking nos 80%            │
│  desperdiçando ~60K tokens/sessão sem retorno.          │
│                                                        │
│  /think manual ativa nos 20% que importam               │
│  gastando ~6K tokens/sessão com retorno real.           │
└────────────────────────────────────────────────────────┘
```

**Regra prática:** Se você precisa pensar 30 segundos antes de formular o pedido, o Claude provavelmente precisa de thinking para respondê-lo bem. Se o pedido é direto ("faça X"), thinking não ajuda.

**Para agentes e subagentes:** Subagentes com tarefas mecânicas (lint, formatação, validação) nunca devem ter thinking. Chiefs e architects que tomam decisões de roteamento ou design se beneficiam. No frontmatter do agente, use `effort: high` (que influencia thinking) apenas em agentes de decisão, não em workers de execução.

### Resumo do impacto

| Recurso | Tokens/sessão (50 turnos) | % do total |
|---|---|---|
| `promptSuggestionEnabled: true` | ~160.000 | ~34% |
| `autoMemoryEnabled: true` | ~102.000 | ~22% |
| `alwaysThinkingEnabled: true` | ~75.000+ | ~16% |
| `advisorModel` pesado | ~27.500 | ~6% |
| **Total invisível** | **~364.000** | **~78%** |

Desativar tudo economiza entre 50-78% do custo total da sessão.

---

## 8. Configurar modelo advisor mais leve

### O modelo mental: o que o advisor faz

O Claude Code não usa apenas o modelo principal. Internamente, há decisões que precisam de um LLM mas não precisam de Opus/Sonnet:

```
┌───────────────────────────────────────────────────┐
│             DECISÕES DO ADVISOR                    │
│                                                   │
│  "Este comando bash é potencialmente destrutivo?" │
│  → Classificação binária (sim/não)                │
│                                                   │
│  "Este erro é transiente ou permanente?"          │
│  → Classificação de 3 classes                     │
│                                                   │
│  "O contexto precisa de compactação?"             │
│  → Decisão de threshold                           │
│                                                   │
│  "Qual a prioridade desta tarefa?"                │
│  → Roteamento interno                             │
│                                                   │
│  Nenhuma dessas respostas é visível ao usuário.   │
│  O advisor NUNCA gera texto que você lê.          │
└───────────────────────────────────────────────────┘
```

**O default:** Sem `advisorModel` configurado, essas decisões são feitas pelo modelo principal. Se você está usando Opus (o mais caro), cada decisão trivial de classificação consome tokens de Opus.

### A configuração

```json
{
  "advisorModel": "claude-haiku-4-5-20251001"
}
```

**Por que Haiku:** Classificação binária e roteamento são tarefas triviais — qualquer modelo acerta >99%. O custo de input do Haiku é ~25× menor que Opus. Em 50 decisões internas por sessão, a economia é proporcional ao custo de ~1-2 respostas completas do Opus.

**Sem impacto na qualidade:** O advisor nunca gera texto que você vê. Ele classifica, roteia, decide thresholds. É como usar uma calculadora para somar — não precisa de superinteligência.

---

## 9. O settings.json final completo

### 9.1 Global (`~/.claude/settings.json`)

Tudo que é preferência pessoal e economia de tokens:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "additionalDirectories": ["~"],
    "allow": [
      "Read(**/*)",
      "Write(**/*)",
      "Edit(**/*)",
      "Bash",
      "WebFetch",
      "WebSearch",
      "Task",
      "Glob",
      "Grep",
      "NotebookEdit",
      "Skill(*)",
      "Bash(claude:*)",
      "mcp__context7__*",
      "mcp__exa__*"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf /*)",
      "Bash(sudo rm -rf:*)",
      "Bash(mkfs:*)",
      "Bash(dd if=/dev/zero:*)",
      "Bash(chmod -R 777 /)"
    ]
  },
  "env": {
    "CLAUDE_CONTEXT_COLLAPSE": "1",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "enableAllProjectMcpServers": true,
  "alwaysThinkingEnabled": false,
  "promptSuggestionEnabled": false,
  "autoMemoryEnabled": false,
  "autoDreamEnabled": false,
  "advisorModel": "claude-haiku-4-5-20251001",
  "skipDangerousModePermissionPrompt": true,
  "skipAutoPermissionPrompt": true
}
```

**Adapte para o seu caso:**

- Substitua os MCPs no `allow` pelos seus servidores reais (olhe o nome em `~/.claude.json` ou `.mcp.json`)
- Ajuste `additionalDirectories` se quiser restringir a pastas específicas em vez de `~`
- Mantenha `spinnerVerbs`, `statusLine`, `voiceEnabled` e outros campos pessoais que já tiver

### 9.2 Project (`.claude/settings.json`)

Apenas o que é específico do repositório — NÃO repita o que o global já cobre:

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(*--no-verify*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)",
      "Bash(git checkout -- .)",
      "Bash(git restore .)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./private/**)"
    ]
  },
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Grep|Glob|Bash|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "REPO=$(git rev-parse --show-toplevel 2>/dev/null) && node \"$REPO/packages/core/memory/hints-injector.cjs\" || true"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "REPO=$(git rev-parse --show-toplevel 2>/dev/null) && bash \"$REPO/.claude/hooks/post-edit-lint.sh\" || true"
          }
        ]
      }
    ]
  }
}
```

### 9.3 O que está no project e por quê

| Campo | Motivo | Alternativa se não estivesse |
|---|---|---|
| `deny` (git force, no-verify, .env) | Proteções específicas deste repo | Outros repos podem querer permitir force push |
| `env.AGENT_TEAMS` | Só este repo usa squads multi-agent | Repos simples não precisam do overhead |
| `hooks.PreToolUse` (hints-injector) | Script existe neste repo (`packages/core/memory/`) | Em outro repo esse path não existe |
| `hooks.PostToolUse` (post-edit-lint) | Script existe neste repo (`.claude/hooks/`) | Em outro repo as regras de lint são diferentes |

### 9.4 O que NÃO está no project e por quê

| Campo ausente | Motivo | O que acontece |
|---|---|---|
| `defaultMode` | Herda do global (`bypassPermissions`) | Declarar no project SOBRESCREVERIA — perderia autonomia |
| `allow` (Bash, Read, etc.) | Global já libera `"Bash"` genérico | 30 linhas redundantes que não adicionam segurança |
| `promptSuggestionEnabled` | Preferência pessoal, não do repo | Herda `false` do global |
| `CLAUDE_CONTEXT_COLLAPSE` | Economia de tokens é universal | Herda `"1"` do global |
| `advisorModel` | Otimização de custo pessoal | Herda `haiku` do global |

### 9.5 Resultado efetivo após merge

```
permissions.defaultMode     = "bypassPermissions"           ← global (project não declarou)
permissions.additionalDirs  = ["~"]                         ← global
permissions.allow           = [Bash, Read, Write, ...]      ← global
permissions.deny            = [rm -rf /, ...,               ← UNION de global
                               git push --force, Read(.env)] ...e project
env.CLAUDE_CONTEXT_COLLAPSE = "1"                           ← global
env.DISABLE_NONESSENTIAL    = "1"                           ← global
env.AGENT_TEAMS             = "1"                           ← project (merge por chave)
enableAllProjectMcpServers  = true                          ← global
alwaysThinkingEnabled       = false                         ← global
promptSuggestionEnabled     = false                         ← global
autoMemoryEnabled           = false                         ← global
autoDreamEnabled            = false                         ← global
advisorModel                = "claude-haiku-4-5-20251001"   ← global
hooks                       = { PreToolUse, PostToolUse }   ← project (SUBSTITUI global)
```

---

## 10. Por que não usar "Caveman Claude"

Você vai ver esse hack circulando: configurar o Claude para responder como um "homem das cavernas" — frases curtas, sem explicação — para economizar tokens de output.

```
normal: "I executed the web search tool" = 8 tokens
caveman: "Tool work" = 2 tokens
```

**O problema:** Isso foca no lugar errado.

Se você leu a [Seção 7](#7-desativar-recursos-que-consomem-tokens-em-background) até aqui, você entende por quê. O custo dominante é o **input** (histórico reenviado), não o output. Uma busca na web traz 2.000 tokens de resultado que ficam no contexto. Economizar 6 tokens na resposta do Claude é irrelevante comparado a desativar prompt suggestions (160K tokens/sessão) ou ativar Context Collapse (30-50% de redução no input).

```
ONDE ESTÃO OS TOKENS DE UMA SESSÃO:

  Input (histórico reenviado)        ████████████████████████████ 70%
  Background (suggestions, memory)   ██████████████ 18%
  Thinking blocks (se ativo)         ████████ 8%
  Output visível do Claude           ██ 4%   ← "Caveman" economiza aqui
```

| Otimização | Onde economiza | Impacto real |
|---|---|---|
| Context Collapse | Input (70% do custo) | Alto |
| Desativar suggestions + memory + dream | Background (18%) | Alto |
| Desativar alwaysThinking | Thinking (8%) | Médio |
| advisorModel Haiku | Decisões internas | Médio |
| "Caveman Claude" | Output do modelo (4%) | Baixo |

A única parte aproveitável do hack é o princípio: **não explicar, só fazer**. Isso já é o comportamento padrão do Claude Code quando bem configurado.

---

## 11. Os números reais de compaction

A documentação e posts online citam números errados sobre quando o Claude compacta o contexto. Os valores reais, verificados diretamente no código-fonte:

### Para Sonnet/Opus 200K

| Threshold | Tokens | % da janela | O que acontece |
|---|---|---|---|
| **Autocompact trigger** | ~179.000 | 89,5% | Compactação automática inicia |
| **Warning UI** | ~159.000 | 79,5% | Alerta amarelo aparece |
| **Blocking limit** | ~189.000 | 94,5% | Claude para de responder até compactar |

### Como é calculado

```
effectiveContextWindow = contextWindow - reservedOutputTokens
                       = 200.000 - 8.000
                       = 192.000

autocompactThreshold   = effectiveContextWindow - AUTOCOMPACT_BUFFER_TOKENS
                       = 192.000 - 13.000
                       = 179.000 tokens (89,5%)

warningThreshold       = autocompactThreshold - 20.000
                       = 179.000 - 20.000
                       = 159.000 tokens (79,5%)

blockingThreshold      = effectiveContextWindow - 3.000
                       = 192.000 - 3.000
                       = 189.000 tokens (94,5%)
```

### Timeline visual de uma sessão sem Context Collapse

```
 0%                                                              100%
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  Turno 1          Turno 20         Turno 35                     │
  │  ▓                ▓▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓            │
  │  ~18K             ~100K            ~140K                        │
  │                                                                  │
  │                              ┌──────┐                            │
  │                              │79.5% │ Warning amarelo            │
  │                              │159K  │                            │
  │                              └──────┘                            │
  │                                           ┌──────┐              │
  │                                           │89.5% │ AUTOCOMPACT   │
  │                                           │179K  │ dispara       │
  │                                           └──────┘              │
  │                                                    ┌──────┐     │
  │                                                    │94.5% │ BLOCK│
  │                                                    │189K  │      │
  │                                                    └──────┘     │
  │                                                                  │
  │  [────── crescimento livre ──────][warning][compact][block]      │
  │                                                                  │
  │  Após autocompact: contexto cai para ~17K (resumo)              │
  │  Cache invalidado. cache_creation pago do zero.                  │
  │  Ciclo recomeça.                                                 │
  └──────────────────────────────────────────────────────────────────┘
```

### Timeline com Context Collapse ativo

```
 0%                                                              100%
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  Turno 1          Turno 20         Turno 35         Turno 50    │
  │  ▓                ▓▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓▓    │
  │  ~18K             ~100K            ~130K            ~125K       │
  │                                                                  │
  │                         ┌──────────────────┐                    │
  │                         │ 90%: Collapse     │                    │
  │                         │ comprime spans    │                    │
  │                         │ Custo: ZERO       │                    │
  │                         │ Cache: PRESERVADO │                    │
  │                         └──────────────────┘                    │
  │                                                                  │
  │  [── crescimento ──][── compressão gradual ──][── estável ──]   │
  │                                                                  │
  │  Contexto oscila entre 120-140K em vez de explodir até 179K.    │
  │  Autocompact raramente dispara. Cache nunca invalidado.          │
  │  Nenhuma interrupção. Nenhum resumo caro.                        │
  └──────────────────────────────────────────────────────────────────┘
```

### Por que isso importa

Se você viu posts dizendo "o Claude compacta aos 83,5% com buffer de 33K" — esses números estão errados. O buffer real é 13K, o threshold real é 89,5%.

Isso significa que você tem **mais espaço do que parece** antes da compactação forçada. Com Context Collapse ativo, o Claude usa esse espaço de forma inteligente e raramente precisa do autocompact destrutivo.

### Override manual do threshold

Se precisar controlar o threshold:

```bash
CLAUDE_CODE_AUTO_COMPACT_WINDOW=150000  # limita janela antes do cálculo
# Resultado: effectiveWindow = 150K - 8K = 142K
#            threshold = 142K - 13K = 129K tokens
```

Isso faz o autocompact disparar mais cedo — útil se você quer sessões mais curtas e limpas.

---

## Resumo em uma tabela

| O que configurar | Campo | Valor | Onde | Ganho |
|---|---|---|---|---|
| Eliminar prompts | `defaultMode` | `"bypassPermissions"` | Global | Zero interrupções |
| Acesso a qualquer pasta | `additionalDirectories` | `["~"]` | Global | Zero prompts de diretório |
| Liberar MCPs globais | `allow` | `"mcp__<nome>__*"` | Global | Zero prompts de MCP |
| MCPs de projeto | `enableAllProjectMcpServers` | `true` | Global | Zero prompts de .mcp.json |
| Compactação proativa | env `CLAUDE_CONTEXT_COLLAPSE` | `"1"` | Global | 30-50% menos tokens de input |
| Tráfego não essencial | env `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `"1"` | Global | Menos overhead de rede |
| Sugestões de prompt | `promptSuggestionEnabled` | `false` | Global | ~160K tokens/sessão |
| Memória automática | `autoMemoryEnabled` | `false` | Global | ~102K tokens/sessão |
| Dream automático | `autoDreamEnabled` | `false` | Global | Evita reescrita de memórias |
| Thinking desnecessário | `alwaysThinkingEnabled` | `false` | Global | ~75K+ tokens/sessão |
| Modelo advisor | `advisorModel` | `"claude-haiku-4-5-20251001"` | Global | ~25× menos custo interno |
| Skip aviso de modo | `skipDangerousModePermissionPrompt` | `true` | Global | Zero avisos repetitivos |
| Skip sugestão de modo | `skipAutoPermissionPrompt` | `true` | Global | Zero interrupções de modo |
| Proteção do repo | `deny` (force, no-verify, .env) | Lista específica | Project | Segurança contextual |
| Agent Teams | env `AGENT_TEAMS` | `"1"` | Project | Multi-agent por repo |
| Hooks de lint/context | `hooks` | PreToolUse + PostToolUse | Project | Qualidade específica do repo |

---

*Baseado em análise do código-fonte do Claude Code — snapshot março/abril 2026.*

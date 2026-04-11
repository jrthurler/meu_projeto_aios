# Reactive Compact vs Context Collapse: Comparação Profunda

Análise extraída diretamente do código-fonte do Claude Code.

---

## Filosofia fundamental

São sistemas com filosofias opostas:

**Reactive Compact** é um bombeiro. Não faz nada preventivo — espera o prédio pegar fogo (API retornar erro 413) e só então age. Princípio: não gaste tokens compactando se talvez não precise.

**Context Collapse** é um arquivista. Trabalha continuamente, dobrando e organizando o contexto à medida que cresce. Nunca deixa acumular até explodir — comprime em partes antes de chegar perto do limite.

---

## Como cada um funciona de verdade

**Reactive Compact** age quando a própria requisição é rejeitada pela API. O fluxo é:

```
Você envia mensagem
    → API rejeita com 413
    → Sistema identifica quantos tokens precisa liberar
    → Remove grupos de mensagens antigos (da cabeça da conversa)
    → Tenta novamente — até 3 vezes
    → Se ainda falhar na 3ª tentativa: erro para o usuário
```

A decisão de quantas mensagens remover tem lógica própria: se o erro da API informa o gap exato de tokens, remove só o suficiente. Se o erro não informa (Bedrock, Vertex), descarta 20% das mensagens de uma vez. Sempre preserva pelo menos 1 grupo para haver algo a sumarizar.

**Context Collapse** age progressivamente em dois limiares:

```
Contexto chega a 90% → inicia compressão granular de spans antigos
Contexto chega a 95% → bloqueia nova requisição até comprimir
```

O mecanismo central é o `projectView()`: uma função que transforma o array de mensagens numa versão mais compacta antes de enviar para a API. O conteúdo original fica preservado localmente — o modelo vê stubs, mas você pode expandir via `/context`.

O que é colapsado primeiro, em ordem de prioridade:
1. Resultados de busca (grep, web search) — conteúdo determinístico, refazível
2. Outputs de hooks executados
3. Notificações de subagentes finalizados
4. Notificações de bash em background

---

## Comportamento com prompt cache

**Reactive Compact** herda o comportamento do compact padrão: usa um fork do agente com os mesmos parâmetros do thread principal para aproveitar o cache já pago. Se o fork funcionar, você não paga pela recriação do cache. Se falhar, cai no streaming normal e paga tudo de novo.

**Context Collapse** é transparente para o cache por design. O `projectView()` só filtra o array de mensagens localmente — não é uma nova requisição. O modelo recebe uma versão menor, o cache lê menos tokens, mas você não paga cache creation extra. A compressão é gratuita em termos de cache.

Detalhe importante: quando um compact tradicional é disparado enquanto o collapse está ativo, o sistema reseta o estado do collapse — o commit log é limpo e as projeções são recalculadas do zero na próxima turn.

---

## O que é perdido em cada um

**Reactive Compact** — perde muito:
- Todo o histórico anterior ao ponto de corte (substituído por resumo)
- Cache de arquivos lidos (limpo após compact)
- Imagens são descartadas antes mesmo da sumarização (para não explodir o próprio compact)
- Thinking blocks anteriores ao corte

O que preserva intencionalmente:
- Plano salvo em `.claude/plan.md`
- Skills que foram invocadas (re-injetadas pós-compact)
- Até 5 arquivos lidos recentemente (reinjetados, limitados a 5K tokens cada)

**Context Collapse** — perde quase nada:
- O conteúdo colapsado existe em dois estados: comprimido (o que o modelo vê) e completo (o que está armazenado)
- Imagens ficam no contexto original — mas podem ser colapsadas dentro de um span
- Thinking blocks podem ser colapsados mas não destruídos
- Você pode expandir um span e ver o conteúdo original

---

## Vantagens e desvantagens

**Reactive Compact**

| Vantagem | Desvantagem |
|---|---|
| Zero tokens gastos preemptivamente | A sessão já falhou quando age |
| Sessões crescem ao máximo possível | Latência surpresa (compact no meio da tarefa) |
| Implementação simples e previsível | Perde todo o histórico anterior |
| Cache sharing disponível via fork | 3 tentativas — depois é erro fatal |
| `/compact` manual usa o mesmo mecanismo | Não funciona se o próprio compact for muito grande |

**Context Collapse**

| Vantagem | Desvantagem |
|---|---|
| Nunca interrompe com erro surpresa | Sistema muito mais complexo (commit log, spans, ctx-agent) |
| Preserva o histórico completo localmente | Se o ctx-agent falha, colapsa tudo |
| Compressão gratuita em termos de cache | Não documentado, sem controle de UI ainda |
| Granular — só comprime o que precisa | Overhead de manter estado paralelo |
| Modelo sempre tem contexto coerente | Comportamento menos previsível de fora |

---

## Casos onde um falha e o outro não

**Sessão com muitas imagens:**
- Reactive Compact strips todas as imagens antes de sumarizar — funciona, mas você perde referência visual
- Context Collapse preserva imagens nos spans — mas se a sessão explodir, as imagens contribuem para o problema

**Prompt-too-long em cascata (quando o próprio compact é muito grande):**
- Reactive Compact tem loop interno de 3 tentativas com drop progressivo
- Context Collapse não tem conceito de retry — se o commit falha, entra em estado de erro

**Sessão longa com muito resultado de grep/bash:**
- Context Collapse colapsa esses resultados primeiro (são os mais descartáveis)
- Reactive Compact só age quando a API rejeita — esses resultados ficam todos lá até o erro

**Bedrock ou Vertex (sem informação de gap no erro):**
- Reactive Compact cai no fallback de 20% — pode remover mais do que precisa
- Context Collapse não depende de informação do erro — age de forma proativa e independente da plataforma

---

## Podem coexistir?

Sim, e é o design intencional:

```
Context Collapse ativo
    → Suprime autocompact proativo
    → NÃO suprime reactive compact

Resultado: Collapse gerencia 90-95% do espaço
           Se a API ainda rejeitar → Reactive como último recurso
           Manual /compact → Roteado via reactive
```

Microcompact (limpeza de tool results velhos) é ortogonal aos dois — todos os três sistemas podem chamar microcompact independentemente.

---

## Qual economiza mais tokens?

**Context Collapse, sem dúvida.** A razão é estrutural:

Reactive Compact destrói para economizar — troca N tokens de conversa por ~17K tokens de resumo. A economia acontece uma vez, é drástica, e você paga o custo de gerar o resumo. Depois o contexto começa a crescer de novo do zero.

Context Collapse economiza sem destruir. O `projectView()` filtra o array de mensagens localmente antes de enviar para a API — sem chamada extra, sem tokens gastos para comprimir. O modelo vê stubs, você não paga os tokens do conteúdo original.

O ponto decisivo é o cache: Reactive Compact invalida o cache ao compactar, e a próxima mensagem paga `cache_creation` do zero. Context Collapse é transparente para o cache — o contexto encolhe, o cache lê menos tokens, mas nenhum cache break acontece. Em sessões longas isso multiplica: cada turno pós-collapse custa menos porque o contexto projetado é menor E o cache continua válido.

O único cenário onde Reactive ganha: sessão que chegou ao limite absoluto e precisa continuar — ali o Collapse já falhou ou não foi suficiente. Mas nesse ponto é recuperação, não otimização.

---

## Collapse é melhor que o default?

**Sim, na maioria dos casos — mas com uma ressalva importante.**

O default (autocompact proativo) compacta quando o contexto chega a ~87%, gerando um resumo de até 17K tokens e invalidando o cache. É um reset periódico e caro.

O Collapse comprime continuamente de forma gratuita — sem chamada extra, sem invalidar cache, sem perder histórico. O contexto fica menor a cada turno automaticamente.

**A ressalva: o Collapse ainda é experimental.** O sistema depende de um `ctx-agent` rodando em paralelo mantendo um commit log de spans. Se esse agente falha, o estado de collapse corrompe. O autocompact padrão é muito mais simples — quando falha, falha de forma óbvia. Também não há controle de UI ainda: com o default você tem `/compact` explícito, com Collapse você não sabe exatamente o que o modelo está vendo em cada momento.

---

## Qual é melhor?

Depende do perfil de uso:

**Use Reactive Compact se:** você faz sessões curtas a médias, quer o máximo de contexto antes de compactar, e aceita a interrupção ocasional quando o limite é atingido.

**Use Context Collapse se:** você faz sessões muito longas, quer que o histórico nunca seja destruído, e prefere compressão gradual e invisível a um reset periódico.

O Reactive é mais simples e previsível. O Collapse é mais sofisticado e preservador — mas mais complexo de debugar quando algo dá errado.

---

## O design ideal que o código sugere

O autocompact padrão some nesse design — é substituído por três sistemas trabalhando em camadas:

```
Context Collapse     → gerencia 90% das situações silenciosamente
Reactive Compact     → safety net quando a API rejeita
Microcompact         → limpa tool results velhos em paralelo
/compact manual      → você decide quando resetar tudo
```

O que indica que a Anthropic está movendo para esse modelo e o autocompact padrão proativo é legado.

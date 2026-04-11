# Economia de Tokens: Guia Pragmático

Insights extraídos diretamente do código-fonte do Claude Code.

---

**Mantenha o ritmo ou recomece do zero**
Cache expira em 5 minutos. Voltar após uma pausa longa recria todo o prefix do zero — você paga `cache_creation` em vez de `cache_read`. Se a pausa for inevitável, vale mais iniciar sessão nova com contexto limpo do que continuar uma "fria". No meio-termo você só perde.

---

**Nunca troque de modelo na mesma sessão**
Trocar de modelo invalida 100% do cache imediatamente. Qualquer outra mudança também quebra: ativar fast mode, adicionar ou remover um MCP, mudar a descrição de uma tool. Decida a configuração antes de começar e não mexa mais.

---

**Adicionar MCP no meio da sessão custa caro**
Cada MCP registra suas tools com schemas completos na cache key. Adicionar ou remover um MCP durante a sessão invalida o cache de toda a conversa. Se for usar MCPs, conecte todos antes da primeira mensagem.

---

**CLAUDE.md tem peso real no seu contexto**
O conteúdo do CLAUDE.md entra no system prompt em toda chamada de API. O limite recomendado é 40.000 caracteres. Quanto maior o arquivo, mais tokens pagos em cada turno — mesmo que o conteúdo nunca mude. Mantenha-o enxuto. Regras que não se aplicam ao projeto atual custam tokens em toda mensagem.

---

**Use subagentes para tudo que é exploratório**
Tudo que o subagente lê, executa e busca fica no contexto dele, não no seu. Para tarefas do tipo "explore esse diretório", "leia esses arquivos e me diga X", "faça esse grep e resuma" — sempre delegue. O subagente ainda aproveita o mesmo cache prefix que você já pagou, sem poluir sua conversa.

---

**Especifique linhas ao pedir leitura de arquivo**
"Leia o arquivo X" pode custar 50K tokens de uma vez. "Leia as linhas 80–150 do arquivo X" custa ~2K. Sempre que souber onde está a informação, seja preciso. O custo da diferença é absurdo.

---

**JSON custa o dobro de qualquer outro arquivo**
Internamente o sistema estima tokens como `tamanho / 4` para texto normal, mas `tamanho / 2` para JSON. Um `package-lock.json`, um schema grande, ou um arquivo de configuração JSON pesado custa literalmente o dobro em tokens. Nunca peça para ler esses arquivos inteiros — extraia só o campo que precisa.

---

**Imagens custam 2.000 tokens fixos, sempre**
Não importa se é um ícone de 2KB ou um screenshot de 4MB — o sistema estima 2.000 tokens para qualquer imagem ou documento. Não mande screenshot quando texto resolve. E atenção: imagens são descartadas durante a compactação de qualquer forma, então elas somem do contexto sem deixar rastro útil.

---

**Respostas longas geram duas chamadas de API**
O sistema reserva só 8K tokens por resposta por padrão. Se a resposta precisar de mais, ele faz um retry automático com 64K. Você paga duas chamadas, com o dobro de latência. Pedidos que gerem respostas muito longas (reescrever arquivo grande, gerar documentação extensa) custam o dobro. Prefira pedir em partes menores.

---

**Grep amplo é veneno silencioso**
Um `grep -r "algo"` que retorna 500 linhas ocupa até 100K tokens no contexto — e fica lá por toda a sessão. O limite interno por tool result é 100.000 tokens. Use padrões específicos, limite ao diretório relevante, use `--include` por extensão. O custo de um grep mal feito persiste por dezenas de turnos.

---

**Thinking blocks acumulam sem limite**
Cada resposta com thinking ativado adiciona um bloco novo ao histórico. Eles nunca são limpos automaticamente — só após 1 hora de inatividade o sistema ativa um "clear latch" que descarta thinking antigos. Em sessões longas com extended thinking, o contexto enche silenciosamente de blocos de raciocínio que ninguém mais lê. Se não precisar de thinking, desative.

---

**`/clear` reseta tudo, incluindo o cache**
O `/clear` não é só limpar a tela — ele invalida o cache do servidor, reseta todos os latches internos (fast mode, AFK mode, thinking clear) e recarrega CLAUDE.md do disco. A próxima mensagem paga como se fosse início de sessão. Use quando quiser realmente começar do zero, não para "economizar".

---

**`/clear` vs `/compact`: quando usar cada um**
Ambos invalidam o cache — na próxima mensagem você paga `cache_creation` de qualquer forma. A diferença está no contexto.

`/compact` gera um resumo da conversa antes de limpar (custa até 20K tokens de output). Use quando estiver no meio de uma tarefa e precisar continuar, ou quando o histórico tem decisões e padrões que serão necessários adiante.

`/clear` apaga tudo sem gerar resumo — é gratuito. Use quando a tarefa anterior terminou e a próxima não tem relação. Usar `/compact` antes de trocar de assunto é desperdício puro: você paga 20K tokens por um resumo que nunca vai ser lido.

**Dentro de uma epic:** entre stories que tocam os mesmos módulos ou seguem padrões estabelecidos → `/compact`. Entre stories de domínios completamente diferentes → `/clear`. Na dúvida dentro de uma epic, `/compact` é mais seguro — o custo do resumo é irrisório comparado a ter que re-explicar decisões arquiteturais.

---

**O sistema superestima seu uso em 33%**
A estimativa interna de tokens usa um padding de 4/3 sobre o cálculo real. O threshold de auto-compact é baseado nessa estimativa inflada — então na prática o sistema compacta antes de precisar. Isso significa que você tem mais espaço do que o sistema acha que tem, mas também que alertas de "contexto cheio" são conservadores.

---

**O padrão geral:** contexto é cumulativo e quase nunca limpo. Cada tool result, arquivo lido, resposta longa e imagem fica lá. A economia real vem de não colocar no contexto o que não precisa estar lá — não de tentar limpar depois.

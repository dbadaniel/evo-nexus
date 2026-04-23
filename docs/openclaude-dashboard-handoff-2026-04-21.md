# OpenClaude no Dashboard - Handoff de 2026-04-21

## Objetivo

Integrar o `openclaude` ao chat do EvoNexus de forma o mais nativa possivel, replicando o comportamento do caminho atual do Claude no dashboard, sem depender do uso manual do terminal.

O foco deste ciclo foi fazer o fluxo de chat funcionar com:

- sessao no dashboard
- contexto conversacional entre turnos
- reconhecimento do agent `oracle`
- uso de ferramentas via CLI
- pedidos reais de aprovacao com botoes `Allow` / `Deny`

## Estado atual

### O que ja avancou bem

1. O dashboard ja consegue usar o caminho CLI do `openclaude` em vez de cair apenas no Claude nativo.
2. O agent `oracle` voltou a ser reconhecido via `--agent oracle`.
3. O contexto entre mensagens esta melhor do que estava antes.
4. Os anexos deixaram de explodir o processo por causa de payload gigante em historico.
5. Os pedidos de aprovacao agora aparecem na UI com botoes reais.
6. O fluxo de aprovacao para ferramentas sensiveis deu um salto importante:
   - antes o agente pedia permissao em texto, mas nao havia callback real
   - agora ja existe card visual com `Allow` / `Deny`
7. O servidor nao esta mais fechando o stdin cedo demais no caminho CLI, o que era um bloqueio para aprovacoes mid-turn.

### O que foi observado hoje na UI

No teste mais recente, apareceu pela primeira vez um pedido real de aprovacao no chat, com botao clicavel para `Bash`.

Isso mostra que a ponte entre dashboard e OpenClaude melhorou bastante e que a integracao de permissao deixou de ser apenas "texto fingindo aprovacao".

Tambem apareceu uma chamada de `AskUserQuestion`, com um payload estruturado contendo:

- `questions`
- `header`
- `options`
- `multiSelect`
- `metadata`

Isso e um sinal importante de maturidade da integracao: o modelo nao apenas respondeu em texto, ele tentou usar um mecanismo estruturado de coleta de resposta do usuario.

## Principais problemas que ainda restam

### 1. `AskUserQuestion` ainda nao esta ligado a uma UI nativa

Hoje o OpenClaude conseguiu emitir algo como:

- `AskUserQuestion`
- com JSON estruturado para perguntas e opcoes

Mas o dashboard ainda nao esta tratando isso como um componente interativo proprio. O resultado pratico foi:

- a ferramenta apareceu como bloco tecnico
- depois o assistente caiu para uma resposta em texto pedindo as mesmas informacoes manualmente

Interpretacao:

- o backend ja esta recebendo ou expondo a chamada da ferramenta
- mas o frontend ainda nao tem o fluxo nativo para renderizar essa solicitacao como formulario/pergunta clicavel

Esse provavelmente e o proximo grande passo de UX.

### 2. Fluxo de imagem ainda nao e multimodal de verdade

Embora o anexo de arquivo esteja funcionando melhor, o caminho atual do `openclaude` no modo CLI ainda nao se comporta como "visao nativa" de imagem no nivel que o Claude nativo faz no dashboard.

Sinais disso:

- leituras de PNG/JPG podem cair em uso de `Read`, o que nao garante entendimento visual real
- em testes anteriores, a descricao retornada nao batia com a imagem enviada

Conclusao:

- anexo existe e serve para fluxo de arquivos
- mas visao real de imagem ainda nao esta resolvida neste caminho

### 3. Ha comportamentos de ferramenta que ainda parecem "tecnicos demais" para a UX do dashboard

Exemplo visto hoje:

- `Bash` apareceu com comando detalhado
- `AskUserQuestion` apareceu como payload bruto

Isso e util para debug, mas ainda nao parece um espelho fino do UX do caminho nativo do Claude.

Provavel necessidade:

- mapear melhor alguns tipos de tool call para componentes mais amigaveis no frontend
- manter o bloco tecnico para inspeção, mas nao como unica forma de interacao

## Mudancas principais feitas no codigo

### Arquivo principal

- [dashboard/terminal-server/src/chat-bridge.js](/abs/path/D:\ExpertSA DEV\evo-nexus\dashboard\terminal-server\src\chat-bridge.js:273)

### O que foi ajustado nessa etapa

1. O caminho CLI foi movido para usar `stream-json` tambem na entrada.
2. Foi habilitado `--permission-prompt-tool stdio`.
3. O `chat-bridge` passou a:
   - escrever mensagem do usuario em NDJSON estruturado
   - capturar `control_request`
   - identificar `can_use_tool`
   - emitir `permission_request` para a UI
   - receber clique do usuario
   - devolver `control_response` para o processo do OpenClaude
4. O processo CLI agora mantem stdin aberto durante o turno, para responder aprovacoes no meio da execucao.
5. O caminho de historico/anexos ja havia sido saneado anteriormente para remover base64 pesado do estado persistido.

## Arquivos que merecem atencao amanha

### Backend / ponte

- [dashboard/terminal-server/src/chat-bridge.js](/abs/path/D:\ExpertSA DEV\evo-nexus\dashboard\terminal-server\src\chat-bridge.js:596)
- [dashboard/terminal-server/src/server.js](/abs/path/D:\ExpertSA DEV\evo-nexus\dashboard\terminal-server\src\server.js:602)
- [dashboard/terminal-server/src/utils/chat-logger.js](/abs/path/D:\ExpertSA DEV\evo-nexus\dashboard\terminal-server\src\utils\chat-logger.js:1)
- [dashboard/terminal-server/src/utils/session-store.js](/abs/path/D:\ExpertSA DEV\evo-nexus\dashboard\terminal-server\src\utils\session-store.js:1)

### Frontend / UX do chat

- [dashboard/frontend/src/components/AgentChat.tsx](/abs/path/D:\ExpertSA DEV\evo-nexus\dashboard\frontend\src\components\AgentChat.tsx:197)

## Pontos ja confirmados por observacao

### Confirmado como funcionando

- reconhecimento do `oracle`
- retomada melhor de contexto entre turnos
- card de aprovacao com `Allow` / `Deny`
- tool calls aparecendo no chat
- progresso interno com `TodoWrite`
- uso de `Glob` e `Bash` no fluxo de trabalho

### Confirmado como ainda incompleto

- UI nativa para `AskUserQuestion`
- multimodal real para imagens no caminho OpenClaude CLI
- paridade fina de UX com o Claude nativo

## Hipotese forte para o proximo passo

O proximo salto nao parece mais ser "fazer o OpenClaude responder".

Esse ponto ja foi em grande parte vencido.

O proximo salto parece ser "dar forma nativa na UI para os eventos estruturados que ele ja esta emitindo".

Os dois eventos mais importantes agora sao:

1. `permission_request`
2. `AskUserQuestion`

Se esses dois fluxos ficarem bem resolvidos, a experiencia deve se aproximar muito mais do caminho nativo.

## Proximos passos recomendados

### Passo 1 - mapear `AskUserQuestion` de ponta a ponta

Objetivo:

- descobrir exatamente como essa chamada chega no `chat-bridge` e no `AgentChat`
- decidir se ela esta vindo como `tool_use`, `assistant`, `tool_result` ou outro tipo intermediario

Perguntas para responder:

- o backend ja recebe um evento estruturado suficiente para renderizar formulario?
- ou sera preciso transformar o payload antes de mandar para o frontend?
- qual e o formato minimo necessario para a UI renderizar:
  - pergunta
  - opcoes
  - escolha unica ou multipla
  - envio da resposta de volta

### Passo 2 - criar UI nativa para `AskUserQuestion`

Objetivo:

- quando o OpenClaude emitir esse tipo de ferramenta, mostrar um componente amigavel no chat

UX desejada:

- titulo curto
- perguntas com botoes/opcoes clicaveis
- envio da resposta estruturada de volta ao agente
- fallback para texto apenas se a UI falhar

### Passo 3 - revisar o comportamento de leitura de imagem

Objetivo:

- definir claramente o limite real do caminho OpenClaude atual

Cenarios a testar:

1. anexo de txt e leitura
2. anexo de png e descricao visual
3. anexo de png e copia/movimentacao para pasta do projeto
4. anexo de png com acao de escrita em arquivo markdown

Resultado esperado desse passo:

- separar o que e "arquivo anexado" do que e "visao multimodal"
- documentar para nao gerar falsa expectativa

### Passo 4 - reduzir exposicao de payload tecnico quando houver UX melhor

Objetivo:

- deixar a interface mais parecida com o uso nativo do Claude

Exemplos:

- `AskUserQuestion` deve virar formulario, nao bloco bruto JSON
- permissao pode manter card tecnico, mas com linguagem mais limpa

### Passo 5 - rodada de regressao

Rodar testes manuais com pelo menos estes cenarios:

1. conversa simples em varias mensagens
2. agent `oracle` respondendo como persona correta
3. pedido de `Bash` com `Allow`
4. pedido de `Bash` com `Deny`
5. `AskUserQuestion` com resposta do usuario
6. anexo de txt
7. anexo de imagem
8. escrita em `workspace/courses`

## Sugestao de roteiro para retomar amanha

1. Abrir este documento.
2. Reproduzir o caso de `AskUserQuestion`.
3. Inspecionar no backend qual mensagem chega do OpenClaude nesse ponto.
4. Mapear no frontend onde renderizar esse evento.
5. Implementar um componente simples de perguntas com opcoes.
6. Testar resposta estruturada voltando para o chat.
7. So depois voltar para multimodal de imagem.

## Pergunta estrategica em aberto

Existe uma pergunta importante para responder depois, antes de pensar em distribuicao externa:

Como empacotar essa integracao do OpenClaude como algo distribuivel, sem precisar distribuir o "problema inteiro" do dashboard?

Em outras palavras:

- da para transformar isso em um addon?
- da para virar um modulo isolado?
- da para empacotar como plugin, bridge, sidecar ou adaptador?
- quais partes hoje estao acopladas demais ao EvoNexus e precisariam ser extraidas?

Essa pergunta nao foi respondida ainda neste ciclo, mas deve entrar na proxima rodada de analise arquitetural.

### Quando responder essa pergunta

Idealmente depois que os dois fluxos mais importantes estiverem estaveis:

1. `permission_request`
2. `AskUserQuestion`

So depois disso vai ficar mais claro quais contratos realmente precisam existir entre:

- frontend
- terminal-server
- backend
- processo `openclaude`

### O que investigar quando formos responder

1. O que hoje e especifico do EvoNexus e o que e reutilizavel.
2. Se a integracao pode ser separada em uma camada de protocolo:
   - entrada de mensagens
   - saida de eventos
   - aprovacoes
   - perguntas estruturadas
   - anexos
3. Se o empacotamento ideal seria:
   - biblioteca Node
   - microservico/sidecar
   - plugin do dashboard
   - adaptador de provedor
4. Quais dependencias de estado persistido precisam ser desacopladas:
   - sessoes
   - logs
   - historico
   - custo/uso
5. Se a UI poderia consumir um contrato generico em vez de detalhes internos do OpenClaude.

## Resumo executivo

Hoje o projeto saiu de um estado em que o OpenClaude:

- respondia parcialmente
- quebrava fluxo de permissao
- nao sustentava bem o ciclo interativo

para um estado em que ele:

- conversa no dashboard
- reconhece o agent
- mantem melhor o contexto
- emite pedidos reais de aprovacao
- ja mostra sinais de ferramentas mais avancadas como `AskUserQuestion`

O maior gargalo agora deixou de ser a execucao basica do OpenClaude e passou a ser a paridade de UX com o Claude nativo.

Em outras palavras:

- o motor esta bem mais perto de funcionar
- a camada de experiencia ainda precisa acompanhar

## Checklist de regressao

Esta secao passa a ser o roteiro padrao para validar se a integracao OpenClaude no dashboard continua saudavel depois de ajustes em:

- `chat-bridge`
- `server.js`
- `AgentChat`
- `AgentDetail`
- `Overview`
- `Agents`
- persistencia de sessoes
- fluxo de aprovacao e trust

### Ordem recomendada de execucao

1. Validar criacao de sessao e primeiro envio.
2. Validar historico, retorno e refresh.
3. Validar `trust` e aprovacoes.
4. Validar `AskUserQuestion`.
5. Validar indicadores globais (`Overview`, `Agents`, custos, ativos).
6. Validar delete, arquivamento e restart do terminal-server.

### Cenarios obrigatorios

#### 1. Entrada no agente sem sessao automatica

Passos:

1. Abrir `Agents > Oracle`.
2. Garantir que nao existe sessao anterior.

Esperado:

- `SESSIONS 0`
- nenhuma conversa nova nasce so por entrar na tela
- a area principal fica vazia, pronta para comecar

#### 2. Primeira mensagem cria a sessao

Passos:

1. Entrar em `Oracle` sem sessao.
2. Mandar uma mensagem simples como `ola`.

Esperado:

- a sessao nasce apenas no primeiro envio
- a mensagem nao some
- nao e preciso digitar duas vezes
- a nova sessao aparece na lateral com timestamp atual

#### 3. Sessao atualiza em tempo real

Passos:

1. Pedir uma tarefa que use ferramentas e leve alguns segundos.
2. Observar a lateral durante a execucao.

Esperado:

- a sessao sobe para o topo
- o preview muda para refletir a ultima atividade relevante
- o estado visual mostra execucao enquanto o turno roda
- ao terminar, o estado volta sozinho para inativo

#### 4. Voltar para a tela sem perder historico

Passos:

1. Iniciar uma conversa.
2. Sair para outra pagina do dashboard.
3. Voltar para o agente.

Esperado:

- a sessao continua listada
- o historico reaparece
- a sessao correta segue selecionavel
- o status da sessao permanece coerente

#### 5. Refresh da pagina

Passos:

1. Com uma conversa existente, dar refresh no navegador.
2. Reabrir o agente.

Esperado:

- o historico volta
- a sessao nao desaparece
- nao ocorre tela em branco nem crash de React

#### 6. Delete de sessao

Passos:

1. Deletar uma sessao existente.
2. Observar a lateral e a area principal.

Esperado:

- a sessao some da lista
- se era a unica, a tela volta para `SESSIONS 0`
- o sistema nao recria sessao fantasma automaticamente

#### 7. Restart do terminal-server

Passos:

1. Encerrar `dashboard/terminal-server`.
2. Subir novamente com `npm run dev`.
3. Voltar ao dashboard.

Esperado:

- sessoes persistidas reais voltam
- sessoes deletadas nao reaparecem
- chats vazios nao nascem so por abrir a pagina

#### 8. `Trust` ligado

Passos:

1. Ativar `Settings > Trust`.
2. Pedir uma tarefa que use `Bash`, `Write` ou `Edit`.

Esperado:

- o agente segue sem pedir `Allow / Deny`
- especialmente no caminho `openclaude` via CLI

#### 9. `Trust` desligado

Passos:

1. Desativar `Trust`.
2. Repetir uma tarefa mutavel.

Esperado:

- aparece o card de aprovacao
- `Allow` continua o fluxo
- `Deny` bloqueia o passo e o agente reage corretamente

#### 10. `AskUserQuestion`

Passos:

1. Forcar um fluxo em que o agente precise perguntar algo estruturado.
2. Responder pelo card.

Esperado:

- a pergunta aparece em UI propria
- a resposta volta de forma estruturada
- nao e enviada mensagem textual workaround do tipo `Aqui estao minhas respostas...`
- o agente continua normalmente depois da resposta

#### 11. Indicadores globais

Passos:

1. Enquanto o `Oracle` estiver rodando, abrir `Overview`.
2. Abrir tambem `Agents`.

Esperado:

- `Overview` mostra o agente ativo
- a pagina `Agents` mostra o card do agente como `RUNNING`
- o contador `active` da pagina `Agents` bate com o estado real
- quando o turno acaba, o estado de execucao some sozinho

#### 12. Custos

Passos:

1. Rodar alguns turnos de chat.
2. Conferir `Overview` e `Costs`.

Esperado:

- custo de chat aparece agregado
- `Overview` e `Costs` nao se contradizem
- deletar uma sessao remove a contribuicao dela do total atual, porque hoje o custo e baseado nas sessoes persistidas

### Baseline atual esperada

Neste momento, o comportamento esperado do sistema e:

- abrir agente nao cria sessao automaticamente
- a primeira mensagem cria a sessao
- historico volta em refresh e retorno de tela
- `Trust` funciona tambem no caminho `openclaude`
- `AskUserQuestion` responde por fluxo estruturado
- `Overview` e `Agents` conseguem enxergar agentes ativos
- sessao de chat nao deve continuar como `running` apos o turno realmente terminar

### O que considerar falha critica

Se qualquer item abaixo acontecer, a regressao deve ser tratada como bloqueadora:

- a primeira mensagem some no momento de criar a sessao
- a conversa reaparece vazia ao voltar para a tela
- o chat cai para tela branca / crash de React
- `Trust` ligado continua pedindo aprovacao
- `AskUserQuestion` volta a depender de mensagem textual workaround
- agente permanece `running` indefinidamente depois do fim do turno
- `Overview` e `Agents` divergem sobre quem esta ativo

### Sugestao de uso deste checklist

- Rodar toda a lista antes de fechar um ciclo maior.
- Rodar ao menos os itens `1, 2, 6, 8, 10 e 11` sempre que houver mudanca em `chat-bridge`, `server.js`, `AgentChat` ou `AgentDetail`.
- Atualizar esta secao sempre que um novo comportamento sensivel entrar no fluxo.

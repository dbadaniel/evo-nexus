# Construindo Plugins Para O EvoNexus

Este guia explica como criar plugins para o EvoNexus. Use este documento como o caminho prático de implementação; para regras de schema e validações detalhadas, veja [`docs/plugin-contract.md`](../plugin-contract.md).

---

## O Que Um Plugin Pode Entregar

Um plugin empacota recursos que o EvoNexus instala e gerencia como uma unidade:

| Recurso | Pasta / Campo | Resultado |
|---|---|---|
| Agentes | `agents/*.md` + `agents:` | Novos agentes na tela Agents e em `.claude/agents/` |
| Skills | `skills/<skill>/SKILL.md` | Novas capacidades reutilizáveis para agentes |
| Commands | `commands/*.md` ou aliases gerados | Slash commands em `.claude/commands/` |
| UI interna | `ui_entry_points` + `ui/pages/*.js` | Páginas no dashboard |
| Páginas públicas | `public_pages` + `ui/public/*.js` | Rotas públicas token-gated |
| Dados readonly | `readonly_data` | Queries seguras expostas via API do plugin |
| Dependências Python | `dependencies` | Pacotes instalados automaticamente |
| Pré-requisitos externos | `prerequisites` | Alertas para env vars, MCPs, CLIs ou setup manual |
| Uninstall seguro | `safe_uninstall` | Wizard de remoção com preservação/exportação de dados |

---

## Estrutura Recomendada

```text
my-plugin/
  plugin.yaml
  agents/
    copywriter.md
    strategist.md
  skills/
    copy-framework/
      SKILL.md
      references/
        examples.md
  commands/
    optional-custom-command.md
  ui/
    pages/
      dashboard.js
    public/
      portal.js
    assets/
      icon.png
  migrations/
    install.sql
    uninstall.sql
  hooks/
    pre-install.sh
    post-install.sh
  scripts/
    export.py
```

Use apenas as pastas necessárias. Um plugin só de agentes pode conter apenas `plugin.yaml` e `agents/`.

---

## Manifesto Mínimo

O arquivo `plugin.yaml` é o contrato entre o plugin e o host.

```yaml
id: turbo-lpsg
name: "Turbo LPSG"
version: "0.1.0"
description: "Squad para planejar e executar lancamentos pagos semanais."
author: "Turbo Academy"
license: "MIT"
homepage: "https://github.com/sua-org/turbo-lpsg"
min_evonexus_version: "0.33.0"
tier: essential

capabilities:
  - agents
  - skills
```

Notas:

1. `id` e o slug do plugin devem ser kebab-case e únicos.
2. Declare em `capabilities` tudo que o plugin usa.
3. Campos desconhecidos ou capabilities não suportadas podem bloquear a instalação.

---

## Agentes

Cada agente é um arquivo markdown em `agents/`.

```text
agents/copywriter.md
```

Exemplo:

```markdown
---
name: copywriter
description: Escreve copy para lancamentos pagos.
model: sonnet
color: "#FF5C00"
---

Voce e o Copywriter Turbo. Sua funcao e criar copy clara, especifica e comercialmente forte...
```

No `plugin.yaml`, declare o agente e sua metadata:

```yaml
command_prefix: turbo

agents:
  - file: agents/copywriter.md
    display_name: "Copywriter Turbo"
    command_name: copywriter
    category: lpsg
    category_label: "Turbo LPSG"
    icon: PenTool
    color: "#FF5C00"
```

Durante a instalação, o host copia o arquivo para o namespace interno:

```text
.claude/agents/plugin-turbo-lpsg-copywriter.md
```

O usuário vê o nome amigável:

```text
Copywriter Turbo
```

---

## Slash Commands De Agentes

Plugins devem usar `command_prefix` para criar aliases públicos curtos.

```yaml
command_prefix: turbo

agents:
  - file: agents/copywriter.md
    command_name: copywriter
```

Alias gerado:

```text
/turbo-copywriter
```

Agente interno:

```text
plugin-turbo-lpsg-copywriter
```

O EvoNexus gera um arquivo de comando em:

```text
.claude/commands/turbo-copywriter.md
```

Esse comando chama o agente interno namespaced. Assim, o usuário usa `/turbo-copywriter`, mas o host mantém o isolamento por plugin.

Regras:

1. `command_prefix` deve ser único entre plugins instalados.
2. `command_name` deve ser único dentro do plugin.
3. O alias final não pode conflitar com comandos nativos ou arquivos existentes.
4. Desabilitar o plugin desabilita seus aliases.
5. Desinstalar o plugin remove seus aliases.

---

## Skills

Skills vivem em `skills/<slug>/SKILL.md`.

```text
skills/copy-framework/SKILL.md
```

Exemplo:

```markdown
# Copy Framework

Use esta skill quando o usuario pedir copy para paginas, anuncios, emails ou mensagens.

## Processo

1. Identifique avatar, oferta e mecanismo.
2. Reescreva a promessa em linguagem do publico.
3. Produza uma versao curta e uma versao expandida.
```

Na instalação, o host namespacia a skill:

```text
.claude/skills/plugin-turbo-lpsg-copy-framework/
```

Inclua referências apenas quando forem realmente usadas pela skill.

---

## Commands Customizados

Além dos aliases de agentes gerados automaticamente, um plugin pode fornecer commands próprios em `commands/*.md`.

```text
commands/diagnostico-lpsg.md
```

Na instalação, o host aplica namespace:

```text
.claude/commands/plugin-turbo-lpsg-diagnostico-lpsg.md
```

Use commands customizados para fluxos específicos. Para chamar agentes diretamente, prefira `command_prefix` + `command_name`.

---

## UI Do Dashboard

Plugins podem adicionar páginas ao dashboard com `ui_entry_points`.

```yaml
ui_entry_points:
  sidebar_groups:
    - id: turbo
      label: "Turbo"
      position: "after:operations"
      order: 10

  pages:
    - id: dashboard
      label: "Turbo Dashboard"
      path: dashboard
      bundle: ui/pages/dashboard.js
      custom_element_name: turbo-dashboard-page
      sidebar_group: turbo
      icon: Rocket
      order: 10
```

O bundle deve registrar um custom element:

```js
class TurboDashboardPage extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<section>Turbo Dashboard</section>`
  }
}

customElements.define('turbo-dashboard-page', TurboDashboardPage)
```

Mantenha bundles pequenos e sem dependências externas não declaradas.

---

## Dados E Migrações

Use `migrations/install.sql` para criar tabelas do plugin.

```sql
CREATE TABLE IF NOT EXISTS turbo_lpsg_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Regras importantes:

1. Prefixe tabelas com o slug lógico do plugin, usando snake_case.
2. Não escreva em tabelas do host sem contrato explícito.
3. Para dados expostos ao frontend ou agentes, prefira `readonly_data`.

Exemplo:

```yaml
readonly_data:
  - name: campaigns
    sql: "SELECT id, name, created_at FROM turbo_lpsg_campaigns ORDER BY id DESC LIMIT 50"
```

---

## Dependências Runtime

Use `dependencies` para pacotes Python que o EvoNexus pode instalar automaticamente.

```yaml
dependencies:
  python:
    packages:
      python-docx: ">=1.1,<2"
      pyyaml: ">=6.0"
```

Use `prerequisites` para coisas que o host não deve instalar sozinho.

```yaml
prerequisites:
  - id: google-credentials
    type: env
    key: GOOGLE_APPLICATION_CREDENTIALS
    label: "Google credentials"
    required: true

  - id: sheets-mcp
    type: mcp
    name: google
    label: "Google MCP"
    required: true
```

Regra mental:

```text
dependencies = o host instala
prerequisites = o operador precisa configurar
```

---

## Safe Uninstall

Use `safe_uninstall` quando o plugin cria dados que não devem sumir em um clique.

```yaml
capabilities:
  - safe_uninstall

safe_uninstall:
  enabled: true
  block_uninstall: false
  reason: "Este plugin pode conter dados comerciais de campanhas."

  user_confirmation:
    checkbox_label: "Entendo que devo exportar os dados antes de remover."
    typed_phrase: "DELETE TURBO"

  pre_uninstall_hook:
    script: scripts/export.py
    output_dir: exports
    timeout_seconds: 120
    must_produce_file: true

  preserved_tables:
    - turbo_lpsg_campaigns
```

Use isso para CRMs, vendas, campanhas, operações financeiras, dados de alunos ou qualquer plugin com dados importantes.

---

## Checklist Antes De Publicar

1. `plugin.yaml` valida sem campos inválidos.
2. `id` é único e estável.
3. `command_prefix` é curto, memorável e único.
4. Todos os agentes têm `display_name` claro.
5. Agentes com aliases têm `command_name` consistente.
6. Arquivos referenciados no manifesto existem.
7. Tabelas e queries usam prefixos seguros.
8. Dependências Python estão em `dependencies`.
9. MCPs, CLIs, credenciais e setup manual estão em `prerequisites`.
10. Uninstall seguro está configurado quando há dados importantes.
11. O plugin instala, desabilita, reabilita, atualiza e desinstala sem sobras.

---

## Exemplo Completo Pequeno

```yaml
id: turbo-lpsg
name: "Turbo LPSG"
version: "0.1.0"
description: "Squad para lancamentos pagos semanais."
author: "Turbo Academy"
license: "MIT"
homepage: "https://github.com/sua-org/turbo-lpsg"
min_evonexus_version: "0.33.0"
tier: essential
command_prefix: turbo

capabilities:
  - agents
  - skills

agents:
  - file: agents/copywriter.md
    display_name: "Copywriter Turbo"
    command_name: copywriter
    category: lpsg
    category_label: "Turbo LPSG"
    icon: PenTool
    color: "#FF5C00"

  - file: agents/estrategista.md
    display_name: "Estrategista Turbo"
    command_name: estrategista
    category: lpsg
    category_label: "Turbo LPSG"
    icon: Compass
    color: "#FF5C00"

dependencies:
  python:
    packages:
      pyyaml: ">=6.0"
```

Com esse manifesto:

```text
/turbo-copywriter   -> @plugin-turbo-lpsg-copywriter
/turbo-estrategista -> @plugin-turbo-lpsg-estrategista
```

---

## Quando Usar Plugin Em Vez De Arquivos Locais

Use plugin quando você quer:

1. Reutilizar o pacote em outros workspaces.
2. Versionar agentes, skills, UI e dados juntos.
3. Instalar/desinstalar sem mexer manualmente em `.claude/`.
4. Expor páginas, integrações ou queries com controle do host.
5. Ter um contrato claro para dependências e pré-requisitos.

Para uma customização pequena e local, adicionar arquivos direto em `.claude/agents` ou `.claude/skills` ainda pode ser suficiente.

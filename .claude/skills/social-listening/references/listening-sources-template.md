# Listening Sources — Template

Copie este arquivo para `workspace/social/[C] listening-sources.md` e preencha os colchetes. A skill `social-listening` lê esse arquivo antes de rodar o loop diário.

Apague seções que não usar. Mantenha curto e atualizado — fontes desatualizadas são piores que nenhuma fonte.

---

## O Que Estamos Monitorando

**Marca/produto:** [nome do produto]
**Categoria:** [ex: "assistente de escrita com IA", "CRM"]
**Objetivo:** [ex: "achar quem está trocando de [concorrente]", "engajar com fundadores de SaaS B2B"]

## ICP (para o scoring)

Usado pela rubrica de scoring da `social-listening` para julgar fit de ICP.

- **Cargo:** [ex: "fundador, head de marketing, ops de marketing"]
- **Estágio da empresa:** [ex: "seed a Series B, 10-200 funcionários"]
- **Setor:** [ex: "SaaS B2B, infra, devtools"]
- **Sinais de fit:** [ex: "escreve sobre GTM, roda anúncios pagos, captou recentemente"]

---

## Contas-Alvo

Engajar com **todo** post relevante dessas contas. Manter a lista em até 20-50.

### LinkedIn (via Computer Use — sessão já logada)
- [Nome] — `linkedin.com/in/handle`

### X / Twitter (via Computer Use)
- [@handle]

### Reddit
- u/[username]

### Bluesky
- [handle.bsky.social]

### Blogs / Newsletters (RSS)
- [Nome] — `https://exemplo.com/feed/`

### Canais do YouTube (RSS)
- [Nome] — channel ID `UCxxxxxxxx`

---

## Palavras-Chave (sinais de intenção)

Buscadas em todas as plataformas no loop diário.

### Alta intenção (comprando ou trocando)
- `"alternativa ao [concorrente]"`
- `"procurando uma ferramenta de [categoria]"`
- `"recomendem um [categoria]"`
- `"trocando de [concorrente]"`
- `"frustrado com [concorrente]"`

### Sinais de dor
- `"[categoria] é tão [ruim/difícil/caro]"`
- `"por que [categoria] é [problema]"`

### Menções à marca
- `"[sua marca]"`
- `"[erro de digitação comum da marca]"`

### Menções a concorrentes
- `"[concorrente 1]"`
- `"[concorrente 2]"`

---

## Subreddits

Puxados via API JSON do Reddit no loop diário.

- r/SaaS
- r/Entrepreneur
- r/[seu nicho]

---

## Buscas Salvas (manual / via Computer Use)

### LinkedIn
- Hashtag — `https://linkedin.com/feed/hashtag/seutopico/`

### X — busca avançada
- [Nome da busca] — `https://x.com/search?q=...&f=live`

---

## Não Engajar

- Contas conhecidas por dunking de má-fé: [@handle]
- Marcas/concorrentes que vão printar: [lista]
- Tópicos a evitar: [política, opiniões polêmicas específicas, etc.]

---

## Notas de Execução

- Quando pedirem "top 10 de hoje," seguir o formato de saída definido em `social-listening` (seção "The Daily Triage Loop")
- Para LinkedIn e X, usar Computer Use com a sessão autenticada do usuário
- Para o resto, usar as receitas curl da seção "Sources & Tooling"
- Janela padrão: 24h. Usuário pode sobrescrever.
- Sempre aprovar antes de postar — a saída é rascunho, o usuário revisa e posta manualmente

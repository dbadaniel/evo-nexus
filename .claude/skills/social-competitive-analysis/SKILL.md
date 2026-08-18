---
name: social-competitive-analysis
description: "When the user wants to systematically analyze what's working for competitors or top creators in their niche on LinkedIn, Instagram, or X — not guess. Also use when the user mentions 'reverse engineer,' 'what's working for competitors,' 'analyze top creators,' 'steal like an artist,' 'why does their content perform,' or 'extract patterns from viral posts.' For YouTube specifically, see social-yt-competitive (more tooling, channel-level metrics). For finding real-time mentions/conversations, see social-listening."
metadata:
  version: 1.0.0
---

# Competitive Content Analysis

Systematically analyze top-performing content in the niche and extract proven patterns — instead of guessing what works.

## When to Use

- "O que está funcionando pros concorrentes no LinkedIn/Instagram/X?"
- "Analisa os posts que mais performam nesse nicho"
- "Quero extrair os padrões de hook/formato/CTA de quem já domina esse conteúdo"

For YouTube channel analysis specifically, use `social-yt-competitive` — it has dedicated tooling for channel-level outlier detection. This skill covers LinkedIn, Instagram, and X, and the voice-transfer step that follows analysis on any platform.

---

## The 6-Step Framework

### 1. Niche ID — Find Top Creators

Identify 10-20 creators who consistently get high engagement in the space.

**Selection criteria:** posting consistently (3+/week), high engagement rate relative to followers, audience overlap with the target market, a mix of established and rising creators.

**Where to find them:** search by industry keywords on LinkedIn, check "People also viewed"; on X, check who the target audience follows and engages with; look at who gets featured in industry newsletters.

### 2. Collect — Gather Posts

Collect a meaningful sample (aim for 50-100+ posts per creator where feasible) for analysis.

**What to collect:** post text, engagement metrics (likes, comments, shares, saves), format (text-only, carousel, video, image), posting time/day, hook/first line, CTA used, topic/theme.

**How, given this workspace's tooling:** for LinkedIn/X, use the **Computer Use** MCP to view a target account's `/recent-activity/all/` (LinkedIn) or profile timeline (X) and extract manually — there's no public scraping API for either. For Instagram, same constraint. Where the user has paid tools already (Apify, PhantomBuster, etc.), those work too — just confirm ToS compliance for the platform before running anything automated at scale.

### 3. Analyze — Extract What Actually Works

**Quantitative:** rank by engagement rate, identify the top 10%, look for format patterns (do carousels outperform text?), check timing patterns, compare topic performance.

**Qualitative:** What hooks do top posts use? How long are they? What emotional triggers appear? What topics consistently perform?

### 4. Playbook — Codify Patterns

Document repeatable patterns, not just observations:

```
Padrão: "Eu [ação inesperada] e [resultado surpreendente]"
Exemplo: "Parei de postar todo dia e meu engajamento dobrou"
Por que funciona: gap de curiosidade + contrarian

Padrão: "[Número específico] [coisas] que [resultado]:"
Exemplo: "7 erros de precificação que me custaram R$200 mil:"
Por que funciona: especificidade + aversão à perda
```

**Format patterns:** carousel (hook slide → problema → passos da solução → CTA); thread (hook → promessa → entrega → recapitulação → CTA); story post (hook → setup → conflito → resolução → lição).

**CTA patterns:** pergunta ("O que você acrescentaria?"), concordância ("Concorda ou discorda?"), compartilhamento ("Marca alguém que precisa disso"), salvamento ("Salva pra depois").

### 5. Layer Voice — Apply Direct-Response Principles

Take proven patterns and make them the brand's own:

**"Amigo esperto que descobriu algo"** — escrever como se estivesse mandando um conselho por mensagem, não dando aula. "Descobri que..." em vez de "Você deveria...".

**Específico > vago:**
```
❌ "Tive um bom faturamento"     ✅ "Faturei R$47.329"
❌ "Levou um tempo"                ✅ "Levou 47 dias"
❌ "Muita gente"                   ✅ "2.847 pessoas"
```

**Curto. Respira. Aterrissa.** Uma ideia por frase, quebras de linha liberais, pontos importantes isolados.

**Escrever a partir da emoção** — começar por como se sentiu, não pelo que fez. Palavras emocionais (frustrado, empolgado, apavorado). Vulnerabilidade quando autêntica.

### 6. Convert — Turn Attention into Action

**Conversões suaves:** inscrição em newsletter na bio/comentários, oferta de recurso grátis em comentário de follow-up, gatilho de DM ("Comenta X que eu mando...").

**Conversões diretas:** link nos comentários (não no corpo do post no LinkedIn), menção contextual do produto dentro de conteúdo valioso, posts de case study, "se quiser ajuda com isso, manda DM" (com moderação).

---

## The Formula

```
1. Encontrar o que já funciona (não adivinhar)
2. Extrair os padrões (hooks, formatos, CTAs)
3. Aplicar a voz autêntica da marca por cima
4. Testar e iterar com base nos próprios dados
```

## Checklist

- [ ] Identificados 10-20 criadores/concorrentes de referência
- [ ] Coletados posts suficientes para análise (mín. 50 por criador)
- [ ] Ranqueados por taxa de engajamento
- [ ] Documentados os principais padrões de hook
- [ ] Documentados os principais padrões de formato
- [ ] Documentados os principais padrões de CTA
- [ ] Diretrizes de voz criadas (especificidade, brevidade, emoção)
- [ ] Biblioteca de templates construída a partir dos padrões
- [ ] Tracking configurado pra performance do próprio conteúdo

---

## Related Skills

- `social-yt-competitive` — YouTube-specific version, with dedicated channel-level tooling
- `social-listening` — real-time mentions/conversations, feeds this skill with target-account discovery
- `social-content-pattern-analyzer` — same analysis method applied to the account's **own** past content, not competitors'
- `social-hook-writer` / `social-post-writer` — apply the extracted patterns to new drafts

## Sources

Adapted (MIT-licensed) from the `social` skill's reverse-engineering reference in [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills). Scraping-tool guidance rewritten for this workspace's actual tooling (Computer Use MCP, no dedicated scraping service configured) and cross-referenced against existing skills instead of the source repo's own skill set.

---
name: mkt-content-strategy
description: "When the user wants to plan a content strategy, decide what content to create, or figure out what topics to cover for blog/SEO/thought-leadership content. Also use when the user mentions 'content strategy,' 'what should I write about,' 'content ideas,' 'blog strategy,' 'topic clusters,' 'content planning,' 'editorial calendar,' 'content pillars,' or 'I don't know what to write.' Use this to decide WHAT content to produce, before writing it. For writing individual pieces, see mkt-draft-content. For persuasive/sales copy diagnostics, see mkt-copywriting-frameworks. For social-media-specific strategy, see social-content-strategy (Pixel's domain) — this skill is for blog/owned-content strategy (Mako's domain)."
metadata:
  version: 1.0.0
---

# Content Strategy

You are a content strategist. Your goal is to help plan content that drives traffic, builds authority, and generates leads by being either searchable, shareable, or both.

## Before Planning

Check `CLAUDE.md` and your agent memory (`.claude/agent-memory/mako-marketing/`) for existing business context, brand voice, and prior content decisions before asking questions. Only ask for information not already covered.

Gather this context (ask if not provided):

### 1. Business Context
- What does the company do?
- Who is the ideal customer?
- What's the primary goal for content? (traffic, leads, brand awareness, thought leadership)
- What problems does the product/service solve?

### 2. Customer Research
- What questions do customers ask before buying?
- What objections come up in sales calls?
- What topics appear repeatedly in support tickets?
- What language do customers use to describe their problems?

### 3. Current State
- Is there existing content? What's working?
- What resources are available? (writers, budget, time)
- What formats can be produced? (written, video, audio)

### 4. Competitive Landscape
- Who are the main competitors?
- What content gaps exist in the market?

---

## Searchable vs Shareable

Every piece of content must be searchable, shareable, or both. Prioritize in that order — search traffic is the foundation.

**Searchable content** captures existing demand. Optimized for people actively looking for answers.

**Shareable content** creates demand. Spreads ideas and gets people talking.

### When Writing Searchable Content

- Target a specific keyword or question
- Match search intent exactly — answer what the searcher wants
- Use clear titles that match search queries
- Structure with headings that mirror search patterns
- Place keywords in title, headings, first paragraph, URL
- Provide comprehensive coverage (don't leave questions unanswered)
- Include data, examples, and links to authoritative sources

### When Writing Shareable Content

- Lead with a novel insight, original data, or counterintuitive take
- Challenge conventional wisdom with well-reasoned arguments
- Tell stories that make people feel something
- Create content people want to share to look smart or help others
- Connect to current trends or emerging problems
- Share vulnerable, honest experiences others can learn from

---

## Content Types

### Searchable Content Types

**Use-Case Content** — Formula: [persona] + [use-case]. Targets long-tail keywords.
- "Gestão de fluxo de caixa para agências"
- "Automação de tickets para times de CS"

**Hub and Spoke** — Hub = comprehensive overview. Spokes = related subtopics.
```
/topico (hub)
├── /topico/subtopico-1 (spoke)
├── /topico/subtopico-2 (spoke)
└── /topico/subtopico-3 (spoke)
```
Only use dedicated hub/spoke URL structures for major topics with layered depth. Most content works fine under `/blog`.

**Template Libraries** — High-intent keywords + product adoption. Provide immediate standalone value, show how the product enhances the template.

### Shareable Content Types

**Thought Leadership** — Articulate concepts everyone feels but hasn't named. Challenge conventional wisdom with evidence.

**Data-Driven Content** — Product data analysis (anonymized), public data analysis, original research/experiments.

**Expert Roundups** — 15-30 experts answering one specific question. Built-in distribution.

**Case Studies** — Structure: Challenge → Solution → Results → Key learnings.

**Meta Content** — Behind-the-scenes transparency ("Como chegamos aos primeiros R$50k MRR").

---

## Content Pillars and Topic Clusters

Content pillars are the 3-5 core topics the brand will own. Each pillar spawns a cluster of related content.

### How to Identify Pillars

1. **Product-led** — What problems does the product solve?
2. **Audience-led** — What does the ICP need to learn?
3. **Search-led** — What topics have volume in this space?
4. **Competitor-led** — What are competitors ranking for?

### Pillar Criteria

Good pillars: align with the product/service, match what the audience cares about, have search volume and/or interest, are broad enough for many subtopics.

---

## Keyword Research by Buyer Stage

Map topics to the buyer's journey using proven keyword modifiers:

| Stage | Modifiers | Example |
|---|---|---|
| **Awareness** | "o que é," "como fazer," "guia de," "introdução a" | "O que é gestão de fluxo de caixa" |
| **Consideration** | "melhor," "top," "vs," "alternativas," "comparação" | "[Produto] vs [Concorrente]" |
| **Decision** | "preço," "avaliações," "demo," "teste grátis" | "Comparação de preços de [categoria]" |
| **Implementation** | "templates," "exemplos," "tutorial," "como usar" | "Tutorial passo a passo de [feature]" |

---

## Content Ideation Sources

### 1. Keyword Data
If keyword exports are available (Ahrefs, SEMrush, GSC), analyze for topic clusters, buyer stage, search intent, quick wins (low competition + decent volume + high relevance), and content gaps vs. competitors.

| Keyword | Volume | Difficulty | Buyer Stage | Content Type | Priority |
|---|---|---|---|---|---|

### 2. Call Transcripts / Fathom
If sales or customer call transcripts are available (via `int-fathom`), extract: questions asked → FAQ/blog content; pain points in their own words; objections → proactive content; exact phrases used (voice of customer); competitor mentions.

### 3. Support Tickets
Mine ticket patterns for recurring questions and language (coordinate with `zara-cs` if triage data is needed).

### 4. Forum Research
Use web search: `site:reddit.com [topic]`, `site:quora.com [topic]`, Indie Hackers, Hacker News. Extract FAQs, misconceptions, debates, terminology used.

### 5. Competitor Analysis
`site:concorrente.com/blog` — top-performing posts, topics covered repeatedly, gaps, content structure. Pair with `mkt-competitive-brief` for a fuller competitive picture.

### 6. Sales and Support Input
Common objections, repeated questions, ticket patterns, success stories, feature requests and underlying problems.

---

## Prioritizing Content Ideas

Score each idea on four factors:

| Factor | Weight | Questions |
|---|---|---|
| **Customer Impact** | 40% | How often did this come up in research? What % of customers face it? How emotionally charged is the pain? |
| **Content-Market Fit** | 30% | Does it align with what the product solves? Unique insights available? Customer stories to support it? |
| **Search Potential** | 20% | Monthly volume? Competitiveness? Long-tail opportunities? Trend direction? |
| **Resource Requirements** | 10% | Expertise available? Additional research needed? Assets required? |

| Idea | Customer Impact (40%) | Content-Market Fit (30%) | Search Potential (20%) | Resources (10%) | Total |
|---|---|---|---|---|---|
| Tópico A | 8 | 9 | 7 | 6 | 8.0 |
| Tópico B | 6 | 7 | 9 | 8 | 7.1 |

---

## Output Format

### 1. Content Pillars
3-5 pillars with rationale, subtopic clusters for each, how pillars connect to product.

### 2. Priority Topics
For each recommended piece: topic/title, searchable/shareable/both, content type, target keyword and buyer stage, why this topic (customer research backing).

### 3. Topic Cluster Map
Structured representation of how content interconnects.

---

## Task-Specific Questions

1. What patterns emerge from the last 10 customer conversations?
2. What questions keep coming up in sales calls?
3. Where are competitors' content efforts falling short?
4. What unique insights from customer research aren't being shared elsewhere?
5. Which existing content drives the most conversions, and why?

---

## Related Skills

- **mkt-draft-content** / **mkt-content-creation** — writing the individual pieces once topics are chosen
- **mkt-copywriting-frameworks** — awareness/sophistication diagnostic for any piece with a commercial CTA
- **mkt-seo-audit** / **mkt-seo-ops** — technical SEO and on-page optimization
- **mkt-competitive-brief** — deeper competitor analysis
- **mkt-quality-gate** — score and iterate on drafted content before publishing
- **social-content-strategy** — Pixel's equivalent for social-media-specific topic/pillar planning

## Sources

Adapted (MIT-licensed) from the `content-strategy` skill in [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), with context-loading and cross-references rewritten for this workspace's conventions. The CMS-selection reference from the original was not vendored — out of scope for this workspace, which has no headless CMS integration.

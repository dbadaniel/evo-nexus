---
name: social-video-script-writer
description: "When the user wants to write a script for a short-form video — TikTok, Instagram Reels, or YouTube Shorts. Also use when the user mentions 'video script,' 'reel script,' 'TikTok video,' 'Shorts video,' 'video hook,' 'talking head video,' 'video idea,' or wants help scripting a video from an idea. For text posts, see social-post-writer. For hooks on text posts specifically, see social-hook-writer — this skill has its own video-specific hook library."
metadata:
  version: 1.0.0
---

# Video Script Writer

Write scripts for TikTok, Instagram Reels, and YouTube Shorts — hook, body, CTA, and production notes in one deliverable.

## Context Check

Before writing, read `workspace/social/[C] social-context.md` (if it exists) for voice, niche, and platform preferences.

## Input Gathering

- **Topic or idea** — or a rough concept to develop
- **Platform** — TikTok, Reels, or Shorts (affects length norms and audio strategy)
- **Format** — talking head, slideshow, demo/screen recording, POV/skit, or story arc
- **Length** — default 15-30s unless the format calls for more (story arc runs 45-60s)

---

## Video Hook Library

The first 3 seconds decide whether the video gets watched. Pick a pattern by goal:

### Curiosity Hooks (best for engagement)
- "O segredo de [resultado] que ninguém fala"
- "Testei [coisa] por 30 dias e não esperava isso"
- "Por que ninguém fala sobre isso?"

### Value Hooks (best for saves)
- "Como [alcançar resultado] em [prazo específico]"
- "[Número] [coisas] que vão [benefício]"
- "Pare de fazer [prática comum] — aqui está o porquê"

### Story Hooks (best for watch time)
- "3 meses atrás eu [estado ruim]. Hoje eu [estado bom]."
- "Cometi um erro grande com [tópico]"
- "Isso mudou tudo pra mim"

### Controversial Hooks (best for comments)
- "Opinião impopular: [afirmação ousada]"
- "[Conselho comum] está errado"
- "A maioria de [audiência] erra isso completamente"

---

## Scripting Template

```markdown
## Vídeo: [Título de trabalho]

**Plataforma:** TikTok / Reels / Shorts
**Duração:** XX segundos
**Formato:** [Talking head / Slideshow / Demo / Screen recording]

### Hook (0-3s)
- Visual: [o que o espectador vê]
- Áudio: [o que ouve]
- Texto na tela: [overlay]

### Corpo (3-Xs)
- [timestamp] — [o que acontece / fala]
- [timestamp] — [próximo momento]

### CTA (últimos 3-5s)
- Verbal: [fala]
- Texto: [overlay]
- Ação: [seguir, comentar, link na bio]

### Notas de Produção
- Música/som: [trending ou escolha própria]
- B-roll necessário: [lista de clipes]
- Gráficos: [animações de texto, overlays]
```

### Story Arc (45-60s)
```
[0-3s]   Hook: sugere o resultado
[3-15s]  Setup: contexto e o que está em jogo
[15-45s] Jornada: o que aconteceu
[45-55s] Resolução: o resultado
[55-60s] Lição/CTA
```
Melhor para: histórias pessoais, cases, depoimentos.

### POV/Skit (15-30s)
```
[0-3s]   Setup: texto na tela contextualiza a cena
[3-25s]  Performance: encena o cenário relatável
[25-30s] Virada ou punchline
```
Melhor para: conteúdo relacionável, humor, comunidades de nicho.

---

## Visual Patterns

- **Talking head** — boa iluminação, contato visual com a câmera, gestos para ênfase, fundo interessante
- **Slideshow/carousel de vídeo** — visual forte por slide (2-4s cada), overlays de texto, estilo consistente
- **Screen recording** — zoom nas áreas importantes, destaque de cursor, movimentos suaves; sobrepor o rosto no canto aumenta engajamento
- **B-roll pesado** — mostrar em vez de contar, cortes rápidos (1-3s por plano), misturar planos aberto/médio/fechado

## Audio Strategy

**Som em alta:** conteúdo de entretenimento/lifestyle onde o som encaixa na mensagem, e a trend ainda está subindo (checar página de tendências). Não usar se distrai da mensagem ou já está caindo.

**Áudio original:** conteúdo educacional falado, storytimes, demos de produto, construção de voz de marca reconhecível.

**Dicas de voiceover:** falar um pouco mais rápido que conversa normal, variar o tom, pausar nos pontos-chave, gravar em ambiente silencioso.

## Posting Strategy

| Objetivo | Mínimo | Ótimo |
|---|---|---|
| Crescimento | 1/dia | 2-4/dia |
| Manutenção | 3/semana | 1/dia |
| Teste | 2/semana | 5/semana |

**Fluxo de produção em lote:** ideação (30min, 10-20 conceitos) → roteiro (1h, 5-10 vídeos) → gravação em lote (2h) → edição (2-3h) → agendamento (30min).

## Analytics & Iteration

| Métrica | O que revela |
|---|---|
| % tempo assistido | O conteúdo engaja do início ao fim? |
| Taxa de conclusão | O hook + conteúdo entregaram? |
| Salvamentos | O conteúdo vale a pena revisitar? |
| Compartilhamentos | Vale a pena espalhar? |

**Quando pivotar:** 5+ vídeos com <1% de conclusão → trocar os hooks. Muitas views, poucos seguidores → revisar CTA e fit conteúdo-audiência. Muitos salvamentos, poucos compartilhamentos → conteúdo valioso mas pouco social.

---

## Related Skills

- `social-hook-writer` — hook patterns for text posts (different library, different constraints)
- `social-post-writer` — for the caption that accompanies the video on upload
- `mkt-copywriting-frameworks` — run first if the video has a commercial CTA, to diagnose the right angle before scripting

## Sources

Adapted (MIT-licensed) from the `social` skill's short-form-video reference in [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), translated and cross-referenced to this workspace's existing social skills.

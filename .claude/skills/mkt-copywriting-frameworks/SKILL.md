---
name: mkt-copywriting-frameworks
description: "Direct-response copywriting frameworks — market awareness levels, market sophistication stages, mass desire channeling, mechanism, identification, and amplification — applied before drafting any persuasive content (ads, sales posts, landing pages, email sequences, launch copy). Use when writing copy meant to sell or convert (not purely informational/educational content), when the user mentions 'awareness level,' 'sophistication,' 'mass desire,' 'hook não converte,' 'a copy não está vendendo,' or asks to write/review an ad, sales page, pitch, or promotional post. Complements mkt-draft-content, social-post-writer, and social-hook-writer — run this first when the content's job is to sell."
---

# Copywriting Frameworks (Direct Response)

Direct-response diagnostic and construction framework, based primarily on Eugene Schwartz's *Breakthrough Advertising* plus condensed principles from Ogilvy, Halbert, Kennedy, Sugarman, and Edwards. Use this **before** drafting any content whose job is to sell or convert — not for purely informational or support content.

## When to Use

- Writing an ad, landing page, sales email, launch sequence, or promotional social post
- A piece of copy exists but isn't converting and you need to diagnose why
- User asks to "score this copy," "why isn't this working," or wants headline/hook variants for a sales-oriented piece
- `mako-marketing` or `pixel-social-media` is producing content with a commercial CTA (buy, sign up, book a call, register)

**Skip this for:** educational posts, community updates, internal comms, or anything without a conversion goal — use `mkt-draft-content` / `social-post-writer` directly.

---

## Step 1 — Diagnose Market Awareness (mandatory first step)

Where is the reader *right now*, not where you wish they were. Getting this wrong makes everything downstream irrelevant.

| Level | Reader knows | Headline must lead with |
|---|---|---|
| **Most Aware** | Your product, just wants the deal | The offer itself ("50% off até sexta") |
| **Product Aware** | What you sell, not convinced yet | Differentiation ("O único X que faz Y") |
| **Solution Aware** | Solutions exist, not your product | The biggest result claim |
| **Problem Aware** | Feels the pain, doesn't know solutions exist | Naming/crystallizing the problem |
| **Unaware** | Neither problem nor solution | Story, curiosity, or a named phenomenon — never the offer |

A common failure mode: writing "Most Aware" copy (direct offer) for an "Unaware" or "Problem Aware" audience. It reads as noise because they haven't been sold on the problem yet.

## Step 2 — Diagnose Market Sophistication

How many competitors has this audience already seen make similar claims? This determines which angle still lands.

| Stage | Market has seen | What still works |
|---|---|---|
| 1 | No one making this claim yet | The claim, stated plainly |
| 2 | The claim, from competitors | A bigger/better claim |
| 3 | Claims got out of hand | A mechanism — *how* it works |
| 4 | Mechanisms too, from everyone | A better/newer mechanism |
| 5 | Every mechanism, claim exhausted | Identity — who the buyer becomes/is (see Step 5) |

If unsure of the stage, default one stage more sophisticated than feels comfortable — undershooting the market's sophistication is the more common mistake.

## Step 3 — Channel the Desire, Don't Invent One

You cannot create desire; you can only find where it already burns and attach the product to it. Name which category is doing the work:

- **Functional** — solves a practical problem
- **Identity** — becomes/proves who they are
- **Escape** — gets away from a current state
- **Status** — visible gain relative to others
- **Belonging** — joins a group/tribe

If the copy is trying to manufacture a desire that isn't already present in the market, that's the root cause of weak conversion — fix this before touching headlines.

## Step 4 — Attach the Mechanism

In sophistication stages 3+, an unexplained claim gets dismissed. Check:

- Is there a mechanism at all (the *how*), or just the *what*?
- Is it **named** (a proprietary-feeling term beats a generic description)?
- Is the internal logic **visible** ("porque X faz Y, que causa Z")?
- Is it **differentiated** from what competitors already claim?

## Step 5 — Identification (only for Stage 4-5 / saturated markets)

When claims and mechanisms are exhausted, the only lever left is making the reader feel *found*. Check for at least one vector:

- **Current State Mirror** — "isso sou eu" recognition
- **Identity Aspiration** — who they want to become
- **Tribe Identification** — "gente como eu faz assim"
- **Belief Mirror** — reflects a belief they already hold

## Step 6 — Amplify

Once the right desire/mechanism/identification is chosen, amplify it — this is what turns awareness into urgency:

- **Specificity** (numbers, names, exact claims beat vague ones)
- **Sensory** language (make the outcome felt, not just stated)
- **Time pressure** (real, not fabricated — see Absolute Rules below)
- **Social proof** (specific results/names beat generic testimonials)
- **Cost of inaction** (what staying still actually costs the reader)

---

## Quick Reference — Classic Frameworks

Use these as structural scaffolds once Steps 1-3 have set the angle. Don't apply a framework's structure before knowing the awareness level — the framework organizes the copy, it doesn't decide the message.

| Framework | Author | Best for |
|---|---|---|
| **AIDA + Starving Crowd** | Gary Halbert | Direct mail/email; find the hungry market before writing anything |
| **Big Idea + long-copy research** | David Ogilvy | Brand/product launches where the concept must survive years, not one campaign |
| **PASTOR** (Problem → Amplify → Story/Solution → Transformation → Offer → Response) | Ray Edwards | Sales pages and video sales letters — natural fit for Stage 3-4 markets |
| **Slippery Slide** | Joe Sugarman | Short-form social/ad copy — every line's only job is getting the next line read |
| **No B.S. sales-letter structure** | Dan Kennedy | Aggressive, measurable direct-response offers with a hard deadline |

---

## Self-Audit Before Delivering

Run this on any persuasive draft before handing it off. Score honestly — this is a gate, not a formality.

1. **Awareness match** — does the opening line match the diagnosed level? (Critical mismatch = start over)
2. **Sophistication match** — is the angle (claim / bigger claim / mechanism / better mechanism / identity) appropriate for the stage?
3. **Desire channel confirmed** — named and consistent through the piece, not switched mid-copy
4. **Mechanism present** if Stage 3+ — named, explained, differentiated
5. **Identification present** if Stage 4-5 — at least one vector
6. **Amplification** — at least 2 of the 5 tools used, none fabricated
7. **CTA** — single, specific, matches the awareness level (offer-led only for Most Aware)

For a deeper, scored, multi-round review (including AI-detection and brand-voice checks), hand the draft to `mkt-quality-gate` after this pass — that skill's `conversion-quality` rubric covers headline/CTA/trust mechanics that complement, not duplicate, the diagnostic above.

## Absolute Rules

- Never fabricate urgency, scarcity, results, or testimonials — amplify what's real.
- Never skip Step 1. A perfectly executed framework aimed at the wrong awareness level fails regardless of craft.
- When the diagnosed awareness/sophistication is uncertain, say so explicitly and ask, rather than guessing silently.

## See Also

- `mkt-draft-content` / `mkt-content-creation` — channel-specific structure and formatting (run after this diagnostic, not instead of it)
- `social-hook-writer` — hook pattern library; match the pattern to the awareness level diagnosed here
- `social-post-writer` — platform-native post structure
- `mkt-quality-gate` — full expert-panel scoring and iteration once the draft exists

## Sources

Distilled from Eugene Schwartz's *Breakthrough Advertising* framework and classic direct-response literature (Ogilvy, Halbert, Kennedy, Sugarman, Edwards). Rewritten from scratch for this workspace after reviewing two community skill collections (`copywriting-guru-skills`, `market-awareness-copywriter`) — both had structural issues (missing skill frontmatter, thin persona-only content, unvendored external dependencies) that made direct import impractical; this version keeps only the frameworks with lasting substance and drops the rest.

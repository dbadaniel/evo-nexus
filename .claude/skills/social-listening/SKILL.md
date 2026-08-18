---
name: social-listening
description: "When the user wants a daily list of posts to engage with, to find brand or competitor mentions, or to find people expressing buying intent for their category. Also use when the user mentions 'top posts to comment on,' 'who's talking about,' 'brand mentions,' 'competitor monitoring,' 'find people asking for,' 'social listening,' 'what's the conversation around,' or 'who's complaining about [competitor].' This is for finding and engaging with existing conversations — not for creating original content. For posting, see social-post-writer. Feeds social-content-strategy and social-competitive-analysis with real language and angles."
metadata:
  version: 1.0.0
---

# Social Listening & Engagement Triage

Surface the right posts to engage with each day — instead of randomly scrolling. The goal is a short, scored list ("here are your top 10 posts to comment on"), not an open feed.

## When to Use This

Use listening when the goal is **commenting and relationships**, not posting. Typical asks:
- "Give me the top 10 posts I should comment on today"
- "Who's complaining about [competitor] right now?"
- "Find people asking for a tool like ours"
- "Surface posts from our target accounts in the last 24h"
- "What's the conversation around [topic] this week?"

If the goal is to **create** content, use `social-post-writer` or `social-content-strategy` instead. Listening feeds creation — it surfaces angles, language, and objections — but the output here is a ranked list, not a draft.

## Context Check

Before running the loop, check for a source list at `workspace/social/[C] listening-sources.md`. If it doesn't exist, offer to create one from the template at `references/listening-sources-template.md` — it takes the target accounts, ICP, and keywords once so every future run reads from it instead of re-asking.

---

## The Daily Triage Loop

A repeatable ~20-minute loop.

1. **Pull** — fetch new posts from defined sources (target accounts, keywords, subreddits). See [Sources & Tooling](#sources--tooling).
2. **Filter** — drop anything older than 24h, low signal, or off-topic.
3. **Score** — apply the rubric below. Keep the top 10.
4. **Draft** — for each, draft a comment matched to its tier.
5. **Hand off** — the user reviews, edits, and posts manually. Never auto-post — this is high-stakes for account reputation and platforms flag automated engagement.
6. **Log** — track what was commented on and what got replies, in agent memory (`.claude/agent-memory/pixel-social-media/`), to build an engagement dataset over time.

Output format:

```
TOP 10 POSTS — [data]

1. [Score 9/10] @author — LinkedIn — 2h atrás
   "Acabamos de implementar X e o time tá adorando…"
   Por quê: fit de ICP (B2B SaaS, 50–200 funcionários), sinal de intenção de compra
   Comentário sugerido: [rascunho]
   Link: https://…
```

---

## Scoring Rubric

Score each post 1–10 across five dimensions, then sum and rank.

| Dimension | What it measures | Weight |
|---|---|---|
| **ICP fit** | Is the author the target customer or an influencer? | 2x |
| **Intent signal** | Are they expressing a problem, asking, or shopping? | 2x |
| **Reach potential** | Is the post gaining traction (likes/comments rising)? | 1x |
| **Comment opportunity** | Can something genuinely useful be added, not generic? | 2x |
| **Recency** | Posted in the last 1–4h (early comments win, especially on LinkedIn) | 1x |

**High-value intent signals:** "procurando uma ferramenta que faça X," "por que [categoria] é tão difícil," "acabamos de trocar de [concorrente] porque…," a complaint about a known competitor.

**Drop if:** author isn't ICP and isn't an influencer; post is >24h old with 50+ comments already (your comment gets buried); generic motivational/AI-slop post; self-promotion thread where comments don't get reach; nothing to add beyond "ótimo post!".

## Comment Quality Tiers

Match the comment to the opportunity — don't spend a tier-1 draft on a tier-3 post.

- **Tier 1 — Relationship builder** (target account, high ICP fit, high intent): specific insight or counter-example, reference real experience with numbers/names, a thoughtful follow-up question. 2-4 sentences, no link.
- **Tier 2 — Visibility play** (high-reach post, adjacent topic): one sharp insight in one sentence. Pattern: "Concordo — e a parte que a maioria perde é [X]."
- **Tier 3 — Light touch** (relationship maintenance): specific reaction quoting a line, not "adorei isso."

**Never:** "ótimo post!", reação só de emoji, "+1", clichês tipo "isso é ouro 🔥".

---

## Sources & Tooling

### Reddit, Hacker News, Bluesky — public JSON, no auth

These are public endpoints usable directly via the Bash tool with `curl` + `jq` (already available in this environment).

**Reddit — new posts in a subreddit:**
```bash
curl -s -A "listening/1.0" "https://www.reddit.com/r/SaaS/new.json?limit=25" \
  | jq '.data.children[].data | {title, author, url: ("https://reddit.com"+.permalink), score, num_comments, created_utc, selftext: (.selftext | .[0:300])}'
```

**Reddit — search by keyword (last day, sorted new):**
```bash
curl -s -A "listening/1.0" "https://www.reddit.com/search.json?q=KEYWORD&sort=new&t=day&limit=25" \
  | jq '.data.children[].data | {subreddit, title, url: ("https://reddit.com"+.permalink), author, score, created_utc}'
```

**Hacker News — recent stories mentioning a keyword (Algolia):**
```bash
SINCE=$(($(date +%s) - 86400))
curl -s "https://hn.algolia.com/api/v1/search_by_date?query=KEYWORD&tags=story&numericFilters=created_at_i>${SINCE}" \
  | jq '.hits[] | {title, url, author, points, num_comments, hn_url: ("https://news.ycombinator.com/item?id="+.objectID)}'
```

**Bluesky — search posts by keyword:**
```bash
curl -s "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=KEYWORD&limit=25&sort=latest" \
  | jq '.posts[] | {author: .author.handle, text: .record.text, likes: .likeCount, replies: .replyCount, url: ("https://bsky.app/profile/"+.author.handle+"/post/"+(.uri | split("/") | last))}'
```

Swap `KEYWORD` for competitor names, brand name (for mention tracking), or intent phrases like `"alternativa ao notion"`.

### RSS for blogs, podcasts, YouTube

```bash
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID"
curl -s "https://example.com/feed/" | xmllint --xpath "//item[position()<6]" - 2>/dev/null
```

### LinkedIn & X — no public API

These platforms don't expose useful public search APIs. This workspace's closest tool is the **Computer Use** MCP (desktop control) — it can drive a real, already-logged-in browser session to view feeds, hashtag pages, and saved searches, but treat it as manual/assisted, not fully automated: confirm the session is authenticated before relying on it, and always have the user review before anything gets posted.

**Useful URLs to check manually or via Computer Use:**

| URL pattern | What it shows |
|---|---|
| `linkedin.com/in/HANDLE/recent-activity/all/` | A target account's recent posts |
| `linkedin.com/feed/hashtag/TOPIC/` | Hashtag feed |
| `x.com/search?q=QUERY&f=live` | Real-time search (chronological) |
| `x.com/i/lists/LIST_ID` | A curated list of target accounts |

If Computer Use isn't practical for a given run, fall back to the user's own native saved searches / notifications on those platforms and have them paste in what they're seeing.

**Still closed (no good path):** Instagram & TikTok — no useful public API and browser automation there is detectable/risky. Use native saved searches / hashtag follows.

---

## Per-Platform Notes

- **LinkedIn** — first-hour comments matter most (algorithm weights early engagement heavily). Comments with 5+ words get more reach than reactions.
- **Twitter/X** — reply within 30 min for max reach on big accounts. Quote-tweet beats reply when adding substantial value. Don't pile on dunks — relationships over clout.
- **Reddit** — read subreddit rules first (some ban self-promotion outright). Earn karma before linking to anything owned. Never lead with the product.
- **Hacker News** — comment quality bar is high; low-effort gets downvoted fast. Founders commenting transparently on their own product threads is welcomed.
- **Bluesky** — smaller volume, high engagement-to-follower ratio. Tech/indie-hacker communities are active.

## Common Workflows

**"Top 10 posts to comment on today"** — pull target-account RSS + Reddit relevant subs + HN last 24h → score → output top 10 with suggested comments.

**"Find people complaining about [competitor]"** — Reddit search `"nome do concorrente" -site:concorrente.com` sorted by new + HN comment search + Bluesky search → score by intent signal (high if switching language: "saindo do," "alternativas ao," "frustrado com").

**"Brand mentions this week"** — Reddit + HN + Bluesky search for brand name → output as: precisa resposta (sim/não), tom (positivo/negativo/neutro), resposta sugerida.

---

## Related Skills

- `social-content-strategy` — turns listening insights into topic/pillar decisions
- `social-competitive-analysis` — deeper pattern extraction from competitor content, not just mentions
- `social-post-writer` / `social-hook-writer` — for creating content once the angle is clear

## Sources

Adapted (MIT-licensed) from the `social` skill's listening reference in [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills). The original assumes `dev-browser`/Playwright for LinkedIn/X; rewritten to use the **Computer Use** MCP available in this workspace instead, with source-list path and memory conventions adapted to EvoNexus.

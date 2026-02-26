# Ambient Knowledge

Ambient Knowledge is a Next.js demo of **AI-native message drafting**—where the AI is the core of the experience, but *stays out of your way*.

Instead of a chatbot, you get an **“ambient copilot” inside the composer**: as you type, it finds relevant internal context, explains *why* it was selected, and lets you insert grounded links.

## Why it’s different

- **Invisible by design**: no prompt rituals, no separate chat—just better writing in-place.
- **Grounded**: suggestions always show sources (and you can insert `/wiki/...` links).
- **Trustable**: “Why this?” + scores/freshness, not magical autocomplete.
- **Resilient**: if LLM synthesis is unavailable, it continues in **retrieval-only** mode.

## Quick start

```bash
npm install
npm run dev
```

Optional LLM synthesis:
- Copy `.env.example` → `.env.local`
- Set `ANTHROPIC_API_KEY=...`

No key? Everything still works (retrieval-only + full source visibility).

## 60-second demo script

1) Open `http://localhost:3000`
2) Pick `#api-gateway`
3) Type:

> Hey Sarah, can you approve the PR for the API gateway rate limiting rollout?

4) In the context card:
- Open **Show details** to see **Serving tier**, **freshness**, and **Why this?** (top sources + scores)
- Click **Insert link** → send → your message includes a clickable `/wiki/...` source

5) Click the source link to open the wiki page, then **Back to chat**.

Optional second scenario:
- Go to `#platform-migration`
- Type: “Hey Marcus, what is the status of the billing service migration?”

## Notes

- This repo ships with mock knowledge data; no external services required for the core experience.
- When the LLM call fails (auth/rate limits), the UI stays responsive and continues surfacing context.

# News Box

News Box is a single-service MVP that aggregates global tech/science/astronomy RSS feeds, stores them in PostgreSQL, and adds AI summaries plus **AI News 2.0** relevance scoring and daily Top 3.

## Stack

- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL
- OpenAI / OpenRouter (`gpt-4o-mini` by default)

## Setup

1. Copy env:

```bash
cp .env.example .env
```

2. Install:

```bash
npm install
```

3. Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

4. Seed sources + sample article:

```bash
npm run db:seed
```

5. Run app:

```bash
npm run dev
```

## Internal APIs

All use: `Authorization: Bearer <CRON_SECRET>`

| Endpoint | Purpose |
|----------|---------|
| `POST /api/internal/fetch` | RSS ingest + legacy score on create |
| `POST /api/internal/score` | AI relevance + importance + `finalScore` (batch) |
| `POST /api/internal/summarize` | Summaries for `isRelevant !== false` |
| `POST /api/internal/daily-top` | Daily Top 3 + `DailyBrief` + brief body |

## Public APIs

- `GET /api/articles?category=&range=&sort=&source=&page=&pageSize=`
- `GET /api/top` — today’s persisted Top 3 (fallback to ranked articles if no daily row)
- `GET /api/daily-brief`
- `GET /sitemap.xml`
- `GET /robots.txt`

`GET /api/articles` pagination: `page`, `pageSize`, `range`, `sort` (`latest` | `top`), `source`.

## Railway Cron

Stagger so score runs after fetch, summarize after score, daily brief once per day:

| Job | Cron |
|-----|----------------|
| fetch | `0 */6 * * *` |
| score | `10 */6 * * *` |
| summarize | `*/30 * * * *` |
| daily-top | `0 6 * * *` |
| backfill | `15 */ 2 * * *` |

### Steps

1. Deploy app + PostgreSQL on Railway.
2. Set `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Add four HTTP cron jobs with the header above.
4. Verify logs: fetch → score → summarize → daily-top.

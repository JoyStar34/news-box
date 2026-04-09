# News Box

News Box is a single-service MVP that aggregates global tech/science/astronomy RSS feeds, stores them in PostgreSQL, and adds AI summaries.

## Stack

- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL
- OpenAI API (`gpt-4o-mini` by default)

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

- `POST /api/internal/fetch` - fetch RSS and upsert articles
- `POST /api/internal/summarize` - summarize at most 30 pending articles

Both endpoints require:

`Authorization: Bearer <CRON_SECRET>`

## Public APIs

- `GET /api/articles?category=&page=&pageSize=`
- `GET /api/top`
- `GET /api/daily-brief`

`GET /api/articles` response includes:

- `data`: article list
- `pagination`: `{ page, pageSize, total, totalPages }`

## Railway Cron Checklist

Use two cron jobs (staggered) to avoid long single-request chains:

1. `POST /api/internal/fetch` every 6 hours
2. `POST /api/internal/summarize` every 6 hours, offset by 10-15 minutes

### Steps

1. Deploy app service + PostgreSQL on Railway.
2. Set env vars:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `OPENAI_BASE_URL` (for OpenRouter: `https://openrouter.ai/api/v1`)
   - `OPENAI_MODEL`
   - `CRON_SECRET`
3. In Railway Scheduler, add two HTTP jobs:
   - URL: `https://<your-domain>/api/internal/fetch`
   - URL: `https://<your-domain>/api/internal/summarize`
4. Add request header to both jobs:
   - `Authorization: Bearer <CRON_SECRET>`
5. Verify logs after first run:
   - fetch job should report inserted/failed/source count
   - summarize job should report processed/skipped count

### Suggested Initial Schedule

- Fetch: every 6h (`0 */6 * * *`)
- Summarize: every 6h + 15m (`15 */6 * * *`)



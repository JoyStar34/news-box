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


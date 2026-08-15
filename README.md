# News Box

News Box is a self-hosted technology, science, and astronomy news dashboard. It collects RSS feeds, stores articles in PostgreSQL, enriches them with AI summaries and relevance scores, and publishes a daily Top 3 briefing.

## Features

- Aggregates curated RSS sources into a single feed
- Filters, ranks, and summarizes articles with OpenAI-compatible models
- Produces a persisted daily Top 3 and editorial-style daily brief
- Provides a responsive Next.js web interface and public JSON APIs
- Supports scheduled ingestion and enrichment through protected internal endpoints

## Tech Stack

- Next.js 16 (App Router) and TypeScript
- Prisma and PostgreSQL
- OpenAI SDK, compatible with OpenAI and OpenRouter
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20 or newer
- PostgreSQL database
- An OpenAI-compatible API key

### Install

```bash
git clone https://github.com/JoyStar34/news-box.git
cd news-box
npm install
cp .env.example .env
```

Configure the variables in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/news_box?schema=public"
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o-mini"
CRON_SECRET="use-a-long-random-secret"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Then set up the database and start the app:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## APIs

### Public

| Endpoint | Purpose |
| --- | --- |
| `GET /api/articles` | Paginated articles. Supports `category`, `range`, `sort`, `source`, `page`, and `pageSize`. |
| `GET /api/top` | Today's persisted Top 3, with a ranked-article fallback. |
| `GET /api/daily-brief` | Latest daily news brief. |
| `GET /sitemap.xml` | Search-engine sitemap. |
| `GET /robots.txt` | Crawler instructions. |

### Internal jobs

Internal endpoints require the following header:

```http
Authorization: Bearer <CRON_SECRET>
```

| Endpoint | Purpose |
| --- | --- |
| `POST /api/internal/fetch` | Ingest RSS feeds and assign the legacy score. |
| `POST /api/internal/score` | Batch AI relevance, importance, and final-score calculations. |
| `POST /api/internal/summarize` | Generate summaries for relevant articles. |
| `POST /api/internal/daily-top` | Persist the daily Top 3 and daily brief. |

## Deployment and Scheduling

Deploy the app with a PostgreSQL database on a platform such as Railway or Vercel. Add every variable from `.env.example` in the platform's environment-variable settings; do not upload the `.env` file.

Create protected HTTP cron jobs in this order. Each request needs the `Authorization` header shown above.

| Job | Example cron | Endpoint |
| --- | --- | --- |
| Fetch | `0 */6 * * *` | `/api/internal/fetch` |
| Score | `10 */6 * * *` | `/api/internal/score` |
| Summarize | `*/30 * * * *` | `/api/internal/summarize` |
| Daily brief | `0 6 * * *` | `/api/internal/daily-top` |

## Security

- `.env` files are ignored by Git and must remain local or in your deployment provider's secret store.
- Never place API keys, database URLs, or `CRON_SECRET` values in `NEXT_PUBLIC_*` variables. Those variables are included in the browser bundle.
- If a secret was ever committed, included in a GitHub issue, or pasted into a public log, rotate it immediately. Removing it from a later commit does not remove it from Git history.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create a production build. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:push` | Apply the Prisma schema to the database. |
| `npm run db:seed` | Seed sources and a sample article. |

## License

No license has been specified yet. Add a license file before inviting reuse or contributions.

# News Box

A self-hosted technology, science, and astronomy news dashboard. News Box collects RSS feeds, stores articles in PostgreSQL, ranks them, and can generate Chinese AI summaries and a daily Top 3 briefing.

## Project status

This repository is the source-code distribution, not a hosted news service. The previous demo is offline. No hosted demo, uptime guarantee, or automatic maintenance service is provided. You run your own database, scheduler, and optional AI account. Publishing this code does not start any deployment or scheduled job.

The project is small and experimental. Review the [security checklist](SECURITY.md) before exposing an instance to the internet.

## Features

- Curated RSS source aggregation, category filters, and article ranking
- Optional Responses-API-compatible relevance scoring and summaries
- Persisted daily Top 3 and an editorial-style daily brief
- Responsive Next.js interface and read-only public JSON endpoints
- Bearer-protected ingestion and enrichment jobs
- Local fallback text when AI is not configured

Built with Next.js 16, React, TypeScript, Prisma/PostgreSQL, Tailwind CSS, and the OpenAI SDK. The UI and generated summaries use Chinese.

## Quick start

### 1. Install

Use Node.js 24 LTS (see `.nvmrc`) and npm, plus an empty PostgreSQL database you control. Node.js 22.12 or later is also supported by the package requirements.

```bash
git clone https://github.com/JoyStar34/news-box.git
cd news-box
npm ci
cp .env.example .env
```

No production credentials or database are included. Edit `.env` before running database commands. The sample database URL is for local development only; replace it with your own database configuration.

### 2. Configure

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Your PostgreSQL connection URL. Required to serve article data and run jobs. |
| `CRON_SECRET` | A unique random secret, at least 32 characters. Internal jobs stay locked if it is empty. |
| `OPENAI_API_KEY` | Optional server-side AI key. Leave empty for the basic RSS feed and fallback summary text. |
| `OPENAI_MODEL` | Required when an AI key is set. Use an exact model ID supported by your provider. |
| `OPENAI_BASE_URL` | Optional API endpoint. Empty uses the OpenAI SDK default. OpenRouter: `https://openrouter.ai/api/v1`. |
| `NEXT_PUBLIC_SITE_URL` | Your instance's public origin; defaults to `http://localhost:3000`. Not a secret. |
| `ENABLE_PIPELINE_DEBUG` | Defaults to `false`; temporary authenticated pipeline metrics only. |
| `NEXT_PUBLIC_ENABLE_PLAUSIBLE` | Defaults to `false`. Set to `true` only if you choose to enable Plausible analytics. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Your own domain registered with Plausible; required to enable analytics. |

Generate the job secret locally, then paste the output into your `.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not reuse any old deployment's credentials. The provider/model must support the OpenAI Responses API (`/responses`); a Chat Completions-only endpoint is not sufficient. Model availability, provider terms, region restrictions, and prices vary; select a model currently available to your account. Configure a provider spending limit before enabling AI. No API request is made merely by cloning or building the repository.

### 3. Initialize a development database

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The seed command adds/updates RSS sources only. The dashboard is initially empty until ingestion runs. It does not bundle or download a production news archive. Without an AI key, RSS ingestion and fallback summary text work, but new articles are not AI-classified: the Top 3 requires previously scored relevant articles and can remain empty.

`db:push` is a development setup shortcut, not a reviewed production migration workflow. Back up existing data and plan schema changes separately.

### 4. Fetch your first articles

Send these jobs in order, using the secret from your `.env`. These requests write to your configured database; AI-enabled jobs may incur provider charges. Running the sample commands does not schedule recurring jobs.

```bash
# Set CRON_SECRET in your shell without committing it to a script or sharing it.
# Replace this placeholder with the secret you generated.
export CRON_SECRET='replace-with-your-generated-secret'

curl --fail-with-body -X POST http://localhost:3000/api/internal/fetch \
  -H "Authorization: Bearer $CRON_SECRET"
curl --fail-with-body -X POST http://localhost:3000/api/internal/score \
  -H "Authorization: Bearer $CRON_SECRET"
curl --fail-with-body -X POST http://localhost:3000/api/internal/summarize \
  -H "Authorization: Bearer $CRON_SECRET"
curl --fail-with-body -X POST http://localhost:3000/api/internal/daily-top \
  -H "Authorization: Bearer $CRON_SECRET"
```

Feed availability and format can change. Review and customize the sources in `src/server/rss/sources.ts` and rerun `db:seed`. Removing a source from that list does not delete it from an existing database; deactivate unwanted database rows separately. Review publishers' terms before fetching, redistributing, or sending content to an AI provider.

## APIs

Public endpoints return your instance's news data, not secrets:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/articles` | Paginated articles. Filters: `category`, `range`, `sort`, `source`, `page`, `pageSize`. |
| `GET /api/top` | Today's persisted Top 3 with a ranked-article fallback. |
| `GET /api/daily-brief` | Today's brief object with fallback text/items when no brief is stored. |
| `GET /sitemap.xml`, `GET /robots.txt` | Crawler metadata. |

All internal jobs require `Authorization: Bearer <CRON_SECRET>`:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/internal/fetch` | Fetch RSS feeds and calculate a heuristic score. |
| `POST /api/internal/score` | Batch AI relevance/importance scoring when configured. |
| `POST /api/internal/summarize` | Populate missing summary fields. |
| `POST /api/internal/daily-top` | Persist the daily Top 3 and daily brief. |
| `POST /api/internal/backfill-why-important` | Repair missing explanation fields. |
| `GET /api/debug/pipeline` | Process-local metrics; disabled unless `ENABLE_PIPELINE_DEBUG=true`, then still requires the bearer token. |

There is no end-user login system. Put private instances behind your own access control. Do not expose internal job URLs as public buttons or include their bearer token in frontend code.

## Self-hosting and scheduling

1. Provision your own PostgreSQL database and Node-compatible host.
2. Store server secrets in that host's secret manager. Never upload `.env` to GitHub or put credentials in `NEXT_PUBLIC_*` variables.
3. Install dependencies, generate Prisma, and build with `npm run build`. Start with `npm start`.
4. Apply a reviewed database schema/migration plan separately. Use HTTPS and private database networking.
5. Only if you want recurring collection, configure an external scheduler to invoke the protected POST jobs. Do not assume a provider's built-in cron supports POST or custom authorization headers.

Run fetch → score → summarize → daily-top sequentially. For example, fetch/enrich every six hours and generate the brief once per day after enrichment. Daily brief dates use UTC. Choose limits and timings for your feeds, database, host timeout, and AI budget; avoid overlapping jobs. The application has no distributed scheduler lock, built-in billing cap, or guaranteed full-pipeline retry.

Analytics is opt-in. When enabled, browsers contact Plausible, subject to your instance's privacy notice and configuration. No original maintainer's analytics domain is used. Next.js's own build-tool telemetry can be disabled with `NEXT_TELEMETRY_DISABLED=1`.

## Development checks

```bash
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

The unit tests use synthetic data and do not need a database or paid AI key. They are not a live-provider or database integration test. The current lockfile still reports transitive advisories in lint tooling and Prisma CLI/configuration, including three entries in the production-only audit. See the dated [dependency review](docs/DEPENDENCY_REVIEW.md) for paths and limitations; do not blindly use `npm audit fix --force`.

| Script | Purpose |
| --- | --- |
| `npm run dev` / `npm start` | Development server / production server. |
| `npm run lint` / `npm run typecheck` / `npm test` | Static checks and unit regressions. |
| `npm run build` | Production build. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:push` | Apply schema to a development database. |
| `npm run db:seed` | Add/update configured source rows. |

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Keep pull requests focused, do not include credentials/private logs, and do not publish vulnerability details in public issues.

## License and content rights

Project-owned code and documentation are available under the [MIT license](LICENSE). Dependencies and publisher content retain their own rights; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Feed inclusion is not endorsement or a grant to redistribute articles. AI summaries can contain errors; check the original source.

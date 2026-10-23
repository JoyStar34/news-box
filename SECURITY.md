# Security

News Box is a self-hosted project, not a managed service. Use the latest reviewed version and keep dependencies up to date. No security response SLA is offered.

## Reporting

Use GitHub's private **Report a vulnerability** option on this repository's Security tab if it is available. If it is unavailable, open an issue asking the maintainer for a private reporting channel without including secrets, personal data, or exploit details. Do not paste credentials into public issues or pull requests.

## Deployment checklist

- Keep all API keys, database credentials, and job secrets on the server. Never use `NEXT_PUBLIC_*` for secrets.
- Use a unique, randomly generated `CRON_SECRET` of at least 32 characters and send it in the `Authorization: Bearer ...` header, never a query string.
- Use HTTPS and restrict internal job routes at the network/proxy layer where possible. The shared bearer token is not multi-user authentication.
- Keep pipeline debug and analytics disabled unless explicitly needed. Debug metrics are process-local, not a persistent monitoring system.
- Do not expose the Next.js development server or the database directly to the public internet.
- Limit job concurrency, add scheduler timeouts, and set spending limits with your AI and hosting providers. The app does not enforce a billing cap or a distributed job lock.
- Treat RSS articles and AI responses as untrusted content. Only configure trusted feed sources and provider endpoints. Public API endpoints are read-only but are not a privacy boundary.
- Back up your database before schema changes. Do not run `db:push` blindly on an existing production database.

## If a credential is exposed

Revoke or rotate it at its provider first. Deleting a file or changing Git visibility does not invalidate a credential or erase clones, forks, caches, or pull-request refs. Review access logs and follow GitHub's guidance on [removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository). Do not reuse a historic deployment's secrets.

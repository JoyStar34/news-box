# Contributing

Thanks for helping improve News Box. Start with the setup in [README.md](README.md).

1. For a substantial change, open an issue describing the problem and proposed scope.
2. Work in a topic branch and keep pull requests focused. Include regression tests where practical.
3. Run `npm run db:generate`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
4. Explain how you tested the change, including anything you could not verify.

Never commit `.env`, API keys, database exports, private logs, or third-party article collections. Use synthetic fixtures and placeholder values. Do not call paid providers or a production database in tests. Check `git diff --cached` before committing.

Review dependency changes with `npm audit` and retain upstream license notices. Database schema changes should explain migration and backup implications; `prisma db push` is not a production migration plan.

Contributions must be yours to contribute and compatible with the [MIT license](LICENSE). Third-party content and dependencies retain their own licenses. Maintainer response times are not guaranteed.

For a possible vulnerability, follow [SECURITY.md](SECURITY.md) rather than posting exploit details publicly.

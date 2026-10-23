# Dependency review · 2026-10-23

This is a point-in-time review of the committed npm lockfile, not a security guarantee. Re-run `npm audit` before deploying and follow upstream advisories.

## Updates in the open-source preparation

- Updated Next.js and eslint-config-next from 16.2.2 to 16.4.2. This includes the fixes described in the [October 14 Next.js security release](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- Applied compatible dependency updates and updated tsx to remove the reported esbuild tooling advisory.
- Removed the unused next-plausible dependency. Optional analytics is configured explicitly in the app.

## Remaining findings

The full audit reports eight high-severity package entries across two transitive advisory chains, with no critical findings. The production-only audit reports three high-severity entries in the Prisma chain. Counts include parent packages that inherit an advisory; these are not eight independent vulnerabilities.

1. [braces: stack-exhaustion denial of service](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The path is eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces. This is lint tooling, not an imported application request handler. At review time the audit did not offer a compatible patched dependency; its suggested forced change would downgrade the Next lint configuration across major versions. Do not lint untrusted patterns/configurations outside a constrained development environment.
2. [deepmerge-ts: recursive object graph stack exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). The path is Prisma 6 → @prisma/config → deepmerge-ts 7. Prisma is also an optional peer of @prisma/client, so npm includes this CLI/configuration chain in the production-only audit. The reviewed app imports Prisma Client, not the CLI/configuration merger; configuration comes from the operator, not an HTTP payload. The advisory requires recursive JavaScript object graphs, not plain JSON alone. A fix is available in deepmerge-ts 8, but npm's supported parent-package upgrade is Prisma 7, which needs a separate migration review.

No forced major upgrade, unsupported transitive override, or vulnerability suppression was applied merely to obtain a green audit. Keep database/schema and lint inputs trusted. Reassess these findings when updating Prisma or Next tooling, and review your deployment packaging before treating it as production-ready.

# Third-party software and content

The [MIT license](LICENSE) covers project-owned code and documentation. It does not relicense dependencies, publisher content, logos, or trademarks.

## Dependencies

Dependency versions and package-declared licenses are recorded in `package-lock.json`. Keep the individual packages' license and notice files when distributing dependencies or built/container artifacts.

The direct runtime dependencies use MIT or Apache-2.0 licenses. Some transitive build/runtime components have additional terms, including:

- Sharp's libvips-based native packages include LGPL-3.0-or-later components and other upstream licenses.
- Lightning CSS and axe-core use MPL-2.0.
- caniuse-lite browser-support data uses CC-BY-4.0.

These are not an exhaustive notice bundle or a legal compatibility certification. Consult the exact installed packages and upstream notices for your target platform, especially when redistributing native binaries or modified dependencies. Dependencies are installed from npm rather than vendored in this repository.

## News, feeds, and models

RSS source names and URLs identify external publishers; inclusion does not imply endorsement or permission to republish full articles. News content, abstracts, images, and publisher trademarks remain subject to their owners' rights and applicable feed/API terms. The repository does not include a production article database.

Review each source's terms before ingestion, redistribution, or sending its content to an AI provider. Preserve source attribution and links. AI summaries may be wrong or incomplete and do not change the rights in the source material. Model/API use is governed separately by your chosen provider's terms and pricing.

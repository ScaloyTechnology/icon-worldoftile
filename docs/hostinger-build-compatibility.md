# Hostinger build compatibility

The reported Hostinger error started as a native library mismatch: `@next/swc-linux-x64-gnu@16.3.4` requests `GLIBC_2.29`, which the build image does not provide. Changing the Node major does not replace the operating system's glibc. A subsequent Hostinger deployment with Webpack and cached WASM still failed while loading `next.config.ts`: the compiled config imported a missing hashed `.next.config` module. After converting to `next.config.mjs`, Hostinger reached page-data collection and then failed because `SITE_URL` was configured as a bare hostname (`deeppink-raccoon-748419.hostingersite.com`), which is invalid input for `new URL()`. The exact Hostinger glibc version has not been measured here.

## Build configuration

- Keep Next.js 16.3.4 and React/React DOM 19.2.8.
- Install the exact matching official `@next/swc-wasm-nodejs@16.3.4` dependency.
- Use `prisma generate && next build --webpack`. Turbopack requires native bindings; Webpack supports the automatic SWC WASM fallback.
- Keep native optional dependencies installed. Next.js uses native SWC where it works and automatically falls back when loading fails. No private flags, patched dependencies, Babel configuration, or project-wide TypeScript changes are used.
- Use the single `next.config.mjs`, imported as native JavaScript ESM. This bypasses Next.js's TypeScript config transpilation and its generated `next.config.compiled.js` path. The conversion preserves all options exactly: `poweredByHeader`, `reactStrictMode`, `agentRules`, `allowedDevOrigins`, and `images`. The old `next.config.ts` is removed; JSDoc retains editor type information.
- Keep `engines.node` at `>=22.12.0`. Hostinger supports Node 22 and 24; verification uses Node 24.19.0. There is no evidence that switching to 22 fixes the glibc mismatch.
- Commit `package-lock.json`, which was previously absent and ignored. Use `npm ci` for repeatable installs, including development and optional dependencies during the build.

Next.js 16.3.4's fallback loader can download the matching WASM package into `node_modules/next/wasm` even when the top-level WASM dependency is present. This was observed during verification. The build therefore still needs registry access and a writable Next.js package/cache directory on a clean machine. The dependency alone does not force WASM or eliminate that download.

For standalone local validation after `npm ci`, run `npm run db:generate` before `npm run typecheck`. Prisma 7 does not leave the generated client available after this project's clean install. `npm run build` already handles generation itself.

## Hostinger settings

Use the Next.js preset, project root `./`, Node 24.x, and build command `npm run build`. Ensure a custom build override does not invoke plain `next build`, which selects Turbopack. Do not set `NEXT_DISABLE_SWC_WASM`. Keep normal Next.js server deployment and image handling.

Set `SITE_URL` to the public origin, ideally including the protocol, for example `https://deeppink-raccoon-748419.hostingersite.com`. The application now normalizes a bare hostname to `https://...` before metadata, sitemap, robots, and schema URL generation. This keeps Hostinger's automatic hostname value from breaking static collection for `/_not-found`.

After deploying, check `/`, `/meet-icon`, `/products`, and `/contact`, including animations, WebGL canvases, image optimization, and database-backed requests. A successful local build is not confirmation of a successful Hostinger deployment.

## Remaining limits

No Linux distribution is installed in the verification environment. Simulating failure of only the native Next.js SWC binding on Windows exercises the fallback but does not verify Hostinger's other native dependencies (such as Sharp, Tailwind Oxide, and Lightning CSS), memory limits, filesystem permissions, or runtime networking.

The supplied Hostinger `DATABASE_URL` points to `127.0.0.1:55439`. That only reaches PostgreSQL in the same environment. Database architecture, schema, and configuration are unchanged; production database connectivity remains a separate deployment task.

## Verification results (2026-09-14)

Verification ran on Windows with Node 24.19.0 and npm 10.8.2.

| Check | Result |
| --- | --- |
| Failure reproduction | Blocking native Next SWC loads caused the original Turbopack build to fail after successfully loading WASM and `next.config.ts`. |
| WASM Webpack build | Passed with the same native-load failure injected into the build and its child processes; all 18 static pages generated. |
| `npm ci --no-audit --no-fund` | Passed, 531 packages installed from the new lockfile. |
| Prisma generation | Passed, client 7.10.0; no database connection needed. |
| `npm run lint` | Passed. Initial run flagged only temporary verification helpers; corrected before rerunning. |
| `npm run typecheck` | Passed after `npm run db:generate`. Immediately after clean install it reported the missing generated PrismaClient export. |
| `npm test` | Passed, 22 tests, zero failures after adding URL-normalization coverage. |
| `npm run build` | Passed using native SWC and Webpack after clean install; all 18 static pages generated. |
| Browser smoke checks | `/`, `/meet-icon`, `/products`, `/contact`: HTTP 200, expected titles, no uncaught page errors at 1440x900. |
| Animation/3D checks | Homepage enhanced animation class initialized; homepage and Products canvases rendered; GSAP and Three.js code present in emitted chunks. |
| Dependency tree | Next 16.3.4, React/React DOM 19.2.8, SWC WASM 16.3.4; no React peer conflict reported. |
| Linux SWC | `npm ls @next/swc-linux-x64-gnu` is empty on Windows (expected); optional version 16.3.4 is present in the lockfile for Linux installation. |
| Lockfile | Root dependencies, devDependencies, and engines match package.json; `git diff --check` passed. |
| Hostinger redeployment | User-provided follow-up logs show the MJS config loaded and Webpack/WASM compilation succeeded, then static collection failed on bare-hostname `SITE_URL`. Verification of the URL-normalization follow-up on Hostinger is pending. |

Files changed across the deployment fixes: `package.json`, `.gitignore`, new `package-lock.json`, `next.config.ts` renamed to `next.config.mjs`, `src/lib/seo.ts`, new `tests/seo.test.ts`, and this report. The only added direct dependency is `@next/swc-wasm-nodejs@16.3.4`; the MJS and URL-normalization follow-ups change no dependencies. Existing semver ranges remain unchanged; because no original lockfile was available, the newly resolved transitive tree cannot be compared with the previous Hostinger installation. Next.js, React, Node requirements, config options, routes, images, animations, Prisma schema, and application source are unchanged.

## MJS follow-up verification

The config imported directly using Node's native ESM loader, and a deep equality check confirmed every previous option was preserved. A filesystem check confirmed exactly one active Next config. The full Webpack build passed with native SWC deliberately blocked: `next.config.mjs` loaded in 20ms, Prisma generated successfully, TypeScript passed, and all 18 static pages generated. Lint and all 20 existing unit tests passed again. These are Windows checks; the new Hostinger config failure itself was not reproduced locally, and the MJS deployment still needs confirmation on Hostinger. The ESLint deprecation warning is unrelated to the supplied fatal config import error.

## URL follow-up verification

The latest Hostinger log shows the prior MJS fix working: `next.config.mjs` loaded, the build used cached `@next/swc-wasm-nodejs`, Webpack compiled successfully, and TypeScript passed. The fatal error moved to page-data collection: `ERR_INVALID_URL` with input `deeppink-raccoon-748419.hostingersite.com`.

`src/lib/seo.ts` now normalizes `SITE_URL` through `resolveSiteUrl()`. Missing values still fall back to `http://localhost:3000`; explicit origins keep their protocol; bare hostnames are treated as HTTPS origins. The regression test first failed because no normalizer existed, then passed after the helper was added. A full production build passed with `SITE_URL=deeppink-raccoon-748419.hostingersite.com` and native SWC deliberately blocked, generating all 18 static pages including `/_not-found`. Lint, typecheck, `git diff --check`, and all 22 unit tests passed. Hostinger redeployment after this change is still pending.

## Sources

- [Next.js 16.3.4 SWC loader](https://github.com/vercel/next.js/blob/v16.3.4/packages/next/src/build/swc/index.ts)
- [Next.js CLI: Webpack build option](https://nextjs.org/docs/app/api-reference/cli/next)
- [Hostinger Node.js versions and detection](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/)

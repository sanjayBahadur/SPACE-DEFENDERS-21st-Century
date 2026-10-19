# Release and deployment

Production target: <https://spacedefenders.sanjaymalla.com/> on the existing Cloudflare Pages project `space-defenders-21st-century`. GitHub Pages remains a secondary deployment.

Gameplay remains frozen. v1.0.1 fixes menu fingertip positioning without changing Gunner aiming or combat.

## Verification

```sh
npm ci
npm test
npm run check
npm run build -- --base=/
node scripts/check-static-hosting.mjs
npx playwright install chromium
SMOKE_BASE_PATH=/ npm run test:browser
```

The smoke script owns a preview server on port 4185 and cleans it up. It checks real production files and model/WASM loading in Chromium with a generated camera stream, alongside camera-denial fallback and keyboard/menu cycles. It writes screenshots/traces under ignored `output/production-smoke/`. Physical-hand accuracy is not inferred from the generated stream.

To repeat these checks against the public site:

```sh
SMOKE_BASE_URL=https://spacedefenders.sanjaymalla.com/ npm run test:browser
```

## GitHub automation

[Game checks](../.github/workflows/ci.yml) verifies pushes and pull requests. Its `verify` check is the merge gate.

[Publish game](../.github/workflows/pages.yml) runs on `main` pushes and manual dispatch from `main`. It installs the lockfile, runs tests, builds with the repository prefix and runs the production smoke checks. It then creates `space-defenders-site.zip` and uploads the same `dist/` to GitHub Pages. Deployment depends on the successful build; pull requests never deploy to the production Pages environment.

Repository Pages settings must use **GitHub Actions**. The `github-pages` environment should allow the `main` branch. Actions are pinned to reviewed commit hashes. The deployment job uses Pages/OIDC permissions; no deployment credential is committed to the repository.

The existing Cloudflare integration uses the default root-path `npm run build`. The Pages prefix is supplied only by the Pages/CI build commands, so the root-path host remains compatible.

## Publishing a release

1. Commit focused changes on the feature branch, inspect staged contents and run verification. Preserve published history.
2. Push the branch and open a PR into `main`. Require passing `verify` and review the final changes before merging.
3. Wait for `Publish game` to succeed. Repeat the smoke checks on the public HTTPS URL and inspect the live deployment.
4. Create the version tag on that accepted merge commit. Download the `space-defenders-production` artifact from its successful deployment run and attach its `space-defenders-site.zip` to the GitHub Release. This ZIP is the output that passed the workflow checks; do not substitute a separate local rebuild.
5. Include [changelog](../CHANGELOG.md), public playable link, supported desktop layout, and known hardware-testing limits. The ZIP/site includes [distribution notices](assets-and-models.md).
6. Resolve implemented issues only after live verification, recording the release/PR that supplies the fix. Shield mechanics remain intentionally excluded by the owner.

## Rollback

Keep successful deployment runs and tagged releases. If a live regression occurs and the prior run’s Pages artifact is still retained, identify its deployment job with `gh run view RUN_ID --json jobs`, then rerun only that job with `gh run rerun RUN_ID --job DEPLOY_JOB_ID`. This uses the prior verified artifact instead of rebuilding it. If that artifact has expired, prepare a reviewed revert PR to restore the prior release and let the normal checks/build/deployment run again. Never force-push or move an existing release tag.

The workflow retains its production ZIP artifact for 30 days; release attachments retain accepted builds independently. For the custom domain, use Cloudflare Pages deployment history to roll back to the previously accepted production deployment.

## Static hosting and cost policy

The domain zone reports the Free Website plan. Cloudflare documents static Pages requests as free and unlimited; this game serves static files and runs graphics, audio and hand tracking on the visitor’s device. No Pages Functions, Workers, database, R2 bucket, or paid API is required or added. This does not audit unrelated account subscriptions or domain renewal charges.

Run `node scripts/check-static-hosting.mjs` on the root build before upload. It rejects Worker/Functions output, environment files, non-root asset references, more than 20,000 files, and any asset over 25 MiB. Keep trailer recordings outside `public/` and `dist/`; upload those to YouTube. Hashed application assets receive long browser caching; HTML revalidates so new releases appear promptly. Unhashed model/audio files cache for one day.

The connected Git build uses production branch `main`, command `npm run build`, and output `dist`. Never upload the GitHub Pages subpath build to the custom domain. An authorized direct upload can publish the checked local `dist/` to the existing project without pushing Git history:

```sh
npx wrangler pages deploy dist --project-name=space-defenders-21st-century --branch=main --commit-dirty=true
```

Record the source commit, any local source modifications, deployment ID and artifact hashes. Direct upload does not merge source into `main`; a future Git build can replace it, so reconcile source before the next normal release. Retain the previous Cloudflare production deployment for rollback.

Sources: [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

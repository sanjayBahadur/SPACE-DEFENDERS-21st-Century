# Space Defenders launch readiness

Historical pre-release snapshot. See [release procedures](releasing.md) and the README for the publication prepared afterward.

Audit date: 14 October 2026. This report compares the live GitHub repository with the local `0.9` branch. It proposes the remaining launch work; it does not change hosting settings or publish the branch.

## Decision

The game can produce an optimized production build now. Treat the current branch as a desktop release candidate until the real-camera acceptance pass and public deployment checks are recorded. The next iteration should finish release work rather than add gameplay mechanics or redesign the menu.

GitHub Pages is the recommended target for the requested GitHub-hosted launch. Keep the existing Cloudflare build functional while bringing up Pages, then make one public URL the canonical link in the README and repository About field.

## Verified state

| Area | Evidence on 14 October | Implication |
| --- | --- | --- |
| Published source | GitHub has only `main`, at `cd5446d` from 8 February 2026. The inspected local `0.9` head is `76ff6b2`, 30 commits ahead and zero behind. | The polish work is still local; publish the feature branch and review it before merging. |
| Working tree | Clean before this report. | There are no uncommitted gameplay changes to recover. |
| GitHub review/release | No open pull requests, tags or releases were returned. `main` is unprotected. | Establish a reviewed merge, required checks and a release record. |
| Existing hosting | `main` has a successful Cloudflare Pages check. Its preview and the project URL respond with HTTP 200. | An external hosting integration already exists; inspect its production-branch behavior before merging. This is not the new `0.9` deployment. |
| GitHub Pages | Repository API reports `has_pages: false`; the Pages site endpoint returns 404. | Pages must be enabled and given a deployment workflow. |
| Automated checks | Local CI workflow installs dependencies, runs tests and builds. All 37 tests pass in this audit. | Checks exist locally but have not been exercised by GitHub for the unpublished branch. |
| Production build | `npm run build -- --base=/SPACE-DEFENDERS-21st-Century/` passes; generated HTML uses the repository path. Output is 57 files, 37,098,134 bytes. | The Pages-path build works. Browser verification must still use the built output and deployed HTTPS origin. |
| Deployment automation | Only `.github/workflows/ci.yml` exists; it does not upload or deploy `dist/`. | A successful build currently does not publish the game on GitHub Pages. |
| Acceptance | Chromium automation covers menus, keyboard play, simulated gestures, recovery, health, intro/briefing/credits timing and retry. | Physical gesture accuracy, actual camera latency and long-session behavior remain separate measurements. |
| Distribution records | Root Apache-2.0 license exists. Model/WASM origin/version/hash records and release notices are absent; `dist/` contains no license/notice files. | Finish attribution and provenance documentation for distributed dependencies, model files and artwork. This finding does not establish that any artwork is unauthorized. |

Source references: [original repository](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century), [Cloudflare deployment check](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century/runs/62911550912), [current Cloudflare site](https://space-defenders-21st-century.pages.dev/), [local review](0.9-review.md), [technology guide](technology.md), and [CI workflow](../.github/workflows/ci.yml).

## Remaining work, in order

### 1. Finish the release branch locally

- Add a GitHub Pages workflow with separate build and deployment jobs. Run `npm ci`, tests and the repository-path production build, then upload the resulting `dist/` as the Pages artifact. Deploy only accepted `main` commits or a deliberately selected manual release, rather than pull requests.
- Give the deployment job `pages: write` and `id-token: write`, make it depend on the successful build, use the `github-pages` environment, and serialize production deployments. Verify the selected action versions before implementation. [GitHub workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- Apply the repository base path in the Pages build command. Keep the normal root-path build for Cloudflare; hardcoding the Pages prefix into every build could break the existing root-domain deployment. [Vite Pages guidance](https://vite.dev/guide/static-deploy.html#github-pages).
- Include applicable third-party license texts/notices in the distributed output. Record the local model/WASM source, compatible SDK version and checksums; document the origin of the authored artwork.
- Add a short changelog and choose a consistent release version. Local `package.json` says `0.9.0`, the original package says `0.0.0`, and the latest original commit calls itself `V0.9.3`. Reconcile those labels before creating a tag; do not call the release `1.0` solely because the bundler succeeds.

### 2. Run the final desktop acceptance pass

Use the optimized build, not the development server. Record the browser, webcam and hardware used.

- Verify real left-hand grab/release, right-index aim, thumb flick, fist cannon, stationary jitter and fast movements.
- Lose and recover each hand, deny/retry camera permission, switch to keyboard, pause/resume, and retry after defeat. Confirm no unexpected shot or repeated pause occurs during transitions.
- Confirm the ten-second intro, four-second mission briefing and fifteen-second credits, including early exits and timer cancellation.
- Play a complete twenty-minute run on an integrated-graphics machine and repeat mission/menu cycles. Watch frame time, camera inference time, growing object/listener counts and health fairness.
- Check the intended supported desktop browsers. Make the supported-browser statement match the results; touch/mobile support can remain outside this release.
- Add a small built-site smoke check to CI for the Pages subpath: startup, mission launch, pause/retry, asset loading and keyboard fallback. Automated hand fixtures should complement the physical-camera pass.

### 3. Publish and review

- Push `0.9` as a feature branch and open a pull request into `main`, preserving its focused chronological commits.
- Let GitHub run the checks; review any Cloudflare branch preview that its integration produces.
- Require the verification check on `main` before the reviewed merge. Keep deployment tied to the exact tested commit.
- Enable **Settings → Pages → Source: GitHub Actions**, and confirm the `github-pages` environment permits the intended production branch.

### 4. Deploy, verify and close out

The intended Pages URL, once configured and successfully deployed, is:

`https://sanjayBahadur.github.io/SPACE-DEFENDERS-21st-Century/`

- Deploy the tested artifact. Verify the live HTTPS page, image/model/WASM requests, real camera permission and gameplay at that URL. GitHub Pages supports HTTPS; camera play needs a secure origin. [GitHub HTTPS guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
- Tag the accepted commit and create a GitHub Release with its version, changelog, supported-browser statement, known limitations and playable link. Attach a ZIP of the same tested static output and its attribution files.
- Update README and the repository About link. Distinguish the public production URL from localhost and any staging preview.
- Resolve issues [#6](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century/issues/6), [#7](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century/issues/7), [#8](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century/issues/8), [#9](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century/issues/9) and [#10](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century/issues/10) after confirming their fixes in the released build. Record [#5](https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century/issues/5) as intentionally excluded from this release because the owner requested shield removal.
- Keep the prior accepted commit/artifact available for rollback, with a documented procedure to redeploy it if a live regression appears.

## Work that should not expand this release

Do not add a shield, new mechanics, a new visual identity or mobile controls during the wrap-up. Worker inference, pooling, atlases, audio and further bundle splitting should follow measured needs. The existing large-Phaser-chunk advisory is a performance observation, not a failing build; the local model/WASM files account for most of the static output and are loaded only for camera play.

The immediate deliverable is a reviewable deployment-and-release preparation change, followed by the hardware acceptance record and public deployment verification.

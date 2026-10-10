# Ligature public publication plan

Status: private release candidate. No public repository, package, or external
announcement should be created until the owner explicitly approves publication.

## 1. Product and naming decisions

- Confirm the brand name: **Ligature**.
- Confirm the npm package name: **ligaturejs**.
- Check npm name availability immediately before publication.
- Check GitHub repository-name availability.
- Check domain/social availability if a project site is desired.
- Perform a trademark/conflict search appropriate to the intended markets.
- Decide whether the initial public release is experimental, alpha, or beta.
- Define the supported Node.js versions and Express versions.
- Define the support policy and compatibility guarantees.

## 2. Repository preparation

Create a clean public GitHub repository containing only reusable framework
materials:

- `src/`
- `schemas/`
- `docs/`
- `scripts/`
- `test/`
- `example/`
- `index.d.ts`
- `README.md`
- `LICENSE`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `.gitignore`
- `.editorconfig`
- CI workflow files

Exclude:

- `.env` files and secrets
- personal paths and host-specific configuration
- SearchMonster portal files
- local databases and backups
- `node_modules/`
- browser caches and generated temporary artifacts
- private transcripts or personal notes
- credentials, tokens, SSH information, and deployment details

Run a repository-wide secret scan before the first push.

## 3. Documentation required before release

Update the public documentation with:

- One-sentence project description.
- Why Ligature exists.
- Comparison with React/Vue without claiming universal superiority.
- Installation instructions.
- CLI quick start.
- Complete component example.
- Route/repository/migration example.
- Express integration example.
- Client lifecycle and navigation behavior.
- Security model and limitations.
- Authentication/session/CSRF integration guidance.
- Database adapter guidance.
- Accessibility expectations.
- Browser-testing instructions.
- Agent workflow and completion checklist.
- Versioning and breaking-change policy.
- Troubleshooting guide.
- FAQ.

Add a concise `README.md` path for first-time users and link to detailed
documents under `docs/`.

## 4. Legal and governance files

- Choose and verify the open-source license.
- Add copyright ownership and contributor attribution.
- Add `CONTRIBUTING.md` with development setup, tests, style, and PR rules.
- Add `CODE_OF_CONDUCT.md`.
- Add `SECURITY.md` with private vulnerability-reporting instructions.
- Add a governance/maintainer policy.
- Add a decision record for the public API stability level.
- Confirm all bundled example code and dependencies permit redistribution.

## 5. Package metadata

Before publishing:

- Set package name to `ligaturejs`.
- Set a deliberate version; this release candidate is `0.1.0-rc.1`.
- Set a clear description and keywords.
- Set repository, homepage, bugs, and funding fields if applicable.
- Set the correct `license` field.
- Verify `exports`, `types`, and `bin` entries.
- Verify the CLI command name.
- Verify Node.js `engines`.
- Verify the `files` allowlist.
- Ensure no private files enter the tarball.
- Test installation from the generated tarball in a clean directory.
- Test both ESM import and CLI execution from a clean directory.

Commands:

```bash
npm pack --json
npm publish --dry-run
```

## 6. Quality gates

All must pass before tagging:

```bash
npm ci
npm test
npm run test:browser
npm run test:playwright
npm run test:a11y
npm run release:check
npm audit --audit-level=high
npm pack
```

Also verify:

- Generated apps install and run without access to the source repository.
- CLI-created components, routes, repositories, and migrations pass tests.
- Manifest and schema validation work from a clean install.
- Browser navigation repeatedly mounts/unmounts components correctly.
- Accessibility scanning passes the reference app.
- Package tarball contains no secrets or personal paths.
- Node.js/Express support matrix is tested.

## 7. CI pipeline

Configure GitHub Actions for:

- Dependency installation with `npm ci`.
- Unit/contract tests.
- Browser and Playwright tests.
- Accessibility tests.
- Package contract check.
- `npm audit` at the chosen severity threshold.
- Tarball creation and inspection.
- Node.js version matrix.
- Pull-request checks.
- Main-branch checks.
- Release-tag checks.

Use least-privilege tokens. Do not expose npm or GitHub credentials in logs.

## 8. GitHub release process

1. Create the public repository only after explicit approval.
2. Push the sanitized initial commit.
3. Enable branch protection and required CI checks.
4. Add issue templates.
5. Add pull-request template.
6. Add labels and a security contact.
7. Create a version tag only after all gates pass; this candidate would use
   `v0.1.0-rc.1`.
8. Create GitHub release notes with:
   - What Ligature is.
   - Supported scope.
   - Installation instructions.
   - Known limitations.
   - Breaking-change policy.
9. Publish the matching npm version from the tagged commit.
10. Verify npm page, tarball, CLI, and clean-project installation.

## 9. npm publication process

- Confirm npm account/organization ownership.
- Confirm package name availability.
- Enable two-factor authentication for publishing.
- Prefer trusted publishing from GitHub Actions/OIDC.
- Avoid long-lived plaintext npm tokens.
- Publish from a clean tagged checkout.
- Verify provenance/attestation if available.
- Install the published package in a clean temporary project.
- Run the CLI and generated-app test against the published package.
- Record the published version and integrity metadata.

Do not place credentials in commands, URLs, source files, or transcripts.

## 10. Announcement plan

Prepare, but do not publish until approved:

- Launch announcement.
- Short technical overview.
- Agent-focused workflow example.
- React comparison framed as an evaluation, not an attack.
- Example application repository.
- Documentation site or GitHub Pages decision.
- Community support channel.

Avoid claims such as “replaces React” until independently benchmarked.

## 11. Post-release operations

- Monitor npm downloads and issue reports.
- Respond to security reports privately.
- Track dependency vulnerabilities.
- Publish changelogs for every release.
- Maintain a deprecation policy.
- Run scheduled CI against supported Node.js versions.
- Periodically test clean installation from npm.
- Maintain rollback guidance for bad releases.
- Use npm deprecation rather than deletion for compromised/broken versions.

## 12. Release blocker checklist

Do not publish if any are true:

- Package name or trademark status is unresolved.
- Repository contains secrets or personal infrastructure details.
- Clean tarball installation fails.
- Generated app cannot run independently.
- Required tests fail or are skipped unexpectedly.
- Security policy/contact is missing.
- License ownership is unclear.
- Public API stability is not documented.
- CI does not protect the release branch.
- Publishing credentials are not protected.

## 13. Approval required to publish

The owner must explicitly approve each external action:

- Creating the public GitHub repository.
- Pushing public source code.
- Publishing the npm package.
- Creating a public release.
- Publishing announcements or links.

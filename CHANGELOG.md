# Changelog

All notable changes to `@coolms/ui-react` are listed here. Versions follow [semantic versioning](https://semver.org/).

## 0.1.0-alpha.2 (2026-10-28)

The token file is CSS a browser keeps whole.

- Fixed: `tokens.css` was a copy of `coolms/design-tokens`' SCSS file. Its first line, a `//` comment, is a comment in
  SCSS but not in CSS, so a browser dropped the whole light `:root` block behind it: in the light theme every
  `--cms-*` token was undefined and the components lost their colours, spacing and radii. It is now a copy of
  `dist/coolms-tokens.css`, the same blocks with a CSS comment header, from `coolms/design-tokens` v0.5.0, pinned in
  `design-tokens.lock.json` with the tag's commit.
- Added: `tools/check-css.mjs`, copied from v0.5.0 and pinned the same way, runs on the token file in
  `tokens:check`; `tools/check-css-teeth.mjs` makes sure it still fails a `//` header and a missing file.
- Changed: the README's install line names no version (it named 0.1.0-alpha.1), and says to use 0.1.0-alpha.2 or
  later.

## 0.1.0-alpha.1 (2026-10-23)

The first pre-release. Published from `develop` at 91f0db3, which has no tag; the package already carries
`design-tokens.lock.json` (#1).

- The 15 components of the CoolMS UI contract, each in every state the contract names. `elevation-required` is not
  offered.
- Server helpers for the contract's reactions R1 to R6: `offerFor`, `readRefusal`, `useReread`, `readConflict` and
  `needsClientUpdate`.
- `kit.css`, styled only with `--cms-*` tokens.
- The token file, the UI contract and its checker, all copied from `coolms/design-tokens` v0.4.0 and pinned in
  `design-tokens.lock.json`.
- A published build: one ES module plus type declarations. React is left to the application.
- A demo page with every state, in light and dark.

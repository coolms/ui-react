# Changelog

All notable changes to `@coolms/ui-react` are listed here. Versions follow [semantic versioning](https://semver.org/).

## 0.1.0-alpha.1 (2026-10-23)

The first pre-release.

- The 15 components of the CoolMS UI contract, each in every state the contract names. `elevation-required` is not
  offered.
- Server helpers for the contract's reactions R1 to R6: `offerFor`, `readRefusal`, `useReread`, `readConflict` and
  `needsClientUpdate`.
- `kit.css`, styled only with `--cms-*` tokens.
- The token file, the UI contract and its checker, all copied from `coolms/design-tokens` v0.4.0 and pinned in
  `design-tokens.lock.json`.
- A published build: one ES module plus type declarations. React is left to the application.
- A demo page with every state, in light and dark.

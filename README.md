# @coolms/ui-react

The CoolMS UI kit for React: the components of the CoolMS UI contract, styled by the CoolMS design tokens.

The same contract is implemented for Angular by [`@coolms/ui-angular`](https://github.com/coolms/ui-angular). Two
clients built on different kits may look different; they may not disagree about what the server said. This kit's
server helpers are how a React client reads it.

> **Pre-release.** Every version so far is an alpha (`0.1.0-alpha.N`). npm marks a package's first published
> version `latest` whatever its tag, so a plain `npm install @coolms/ui-react` installs an alpha too. Names, props
> and states may still change between alphas; pin an exact version.

## Install

```bash
npm install @coolms/ui-react@<version>
```

Pin the exact version you test with; the versions are listed on npm. Use `0.1.0-alpha.2` or later: in
`0.1.0-alpha.1` the token file's first line is not CSS, so a browser drops its light theme and the components lose
their colours, spacing and radii.

React 19.2 or later is a peer dependency.

```tsx
import '@coolms/ui-react/tokens.css';
import '@coolms/ui-react/kit.css';
import { Button, List, ContextMenu, offerFor } from '@coolms/ui-react';
```

Dark mode is the token file's: set `data-theme="dark"` on the root element.

## Components

The contract lives in [`coolms/design-tokens`](https://github.com/coolms/design-tokens), beside the tokens, so every
CoolMS UI kit checks against one source. This kit copies it at a tag, and `design-tokens.lock.json` pins each copy.

Every component of `contract/components.json`, each rendering every state the contract names:

| Contract | Component | States |
| --- | --- | --- |
| button | `Button` | default, primary, danger, disabled, busy, locked |
| text-field | `TextField` | default, focused, disabled, read-only, invalid, pinned |
| select | `Select` | default, disabled, read-only, invalid, empty-list |
| toggle | `Toggle` | on, off, disabled, read-only |
| modal | `Modal` | open, closing, dirty |
| confirm-dialog | `ConfirmDialog` | default, danger, discard-changes |
| toast | `Toast`, `ToastRegion` | success, error, info, with-action |
| loading | `Loading` | inline, block |
| empty-state | `EmptyState` | default, with-action |
| error-banner | `ErrorBanner` | default, with-retry |
| page-header | `PageHeader` | default, with-actions, with-back-link |
| tab-strip | `TabStrip` | default, active, with-count |
| list | `List` | loading, empty, populated, selected, error |
| avatar | `Avatar` | picture, initials, presence |
| context-menu | `ContextMenu` | open, item-danger, item-locked, item-refused |

`elevation-required` is not offered: this kit's clients never elevate, so an action the server answers `elevate` is
not offered at all.

## Reading the server

`contract/server-states.json` lists every state the server decides and how every client reacts to it. The helpers:

| Reaction | Helper |
| --- | --- |
| An action is offered from the subject's capabilities map; an unknown answer is denied (R3, R4) | `offerFor(answer, { elevates })` |
| A 403 is the last word; elevation-required is told apart from a refusal (R2) | `readRefusal(status, headers, body, { elevates })` |
| State that expires is read again, not remembered (R1) | `useReread(read)`, `rereadAll()` |
| A versioned write that answers 412 changed nothing (R5) | `readConflict(status)` |
| A server that refuses this client's version is not used further (R6) | `needsClientUpdate(...)` |

A context menu and an action bar take the same list of items, each with its `offerFor` answer, so they cannot
disagree.

## Checks

```bash
npm run verify
```

runs, in order:

- `tokens:check`: the token file, the contract and the checkers are the copies `design-tokens.lock.json` pins; the
  token file is CSS a browser keeps whole, and the check still fails a `//` header; and every token `kit.css` reads is
  defined.
- `check`: `kit.contract.json` covers the contract, and the components and files it names exist.
- `typecheck` and `test`.
- `build`, then `check:built`: the published module loads, exports every declared component, and every target the
  package's `exports` map promises exists.
- `demo:build`.

CI also checks the lock against `coolms/design-tokens` itself: the tag names the lock's commit, and each file there
hashes as the lock says.

`npm run demo` serves a page with every component in every state, in light and dark.

## Licence

MIT

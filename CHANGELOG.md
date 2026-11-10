# Changelog

All notable changes to `@coolms/ui-react` are listed here. Versions follow [semantic versioning](https://semver.org/).

## Unreleased

- `PaneToolbar`: as the pane narrows, labels hide one by one, in the overflow order (lower priority first, a
  priority's actions together), then the pinned actions' from the end of the row; only once every label is hidden do
  actions go behind More, in the same order, never one alone. They come back in the reverse order. An action hiding its
  label keeps it as its tooltip. The row is marked `cms-pane-toolbar--labels-partly-hidden` between the two, the
  contract's new `labels-partly-hidden` state.
- `PaneToolbar`: the classes named as the contract names them. An action whose label is hidden is
  `cms-pane-toolbar__action--bare` (it was `--icon`), and an action drawn without an icon is
  `cms-pane-toolbar__action--text`, the same in both kits.
- `PaneToolbar`: `overflow: 0` means menu only. The action is never drawn in the row, at any width, and always sits behind
  More, first in its menu. More is drawn for it even when it is alone. Its label takes no part in the giving way, and the
  rule that one action never goes behind More alone counts only the actions that could have stayed in the row.
- `Icon`: `file-code`, a file with code's angle brackets, for the server's `file-earmark-code` (Show original).

## 0.1.0-alpha.10 (2026-11-10)

The row of actions at the top of a pane, drawn from the server's action nodes.

- `ContextMenu` takes `focus`, the item focused as it opens; `PaneToolbar`'s More opens its menu on the last item with Up.
- `PaneToolbar`, the contract's `pane-toolbar` (design-tokens develop): the one row of actions at the top of a pane, the
  same height in every pane. It draws the actions it is given, as the server's action nodes give them (id, label, icon,
  group, overflow priority, danger, disabled), and says which was chosen by its id. As the pane narrows every label
  hides at once, then actions go behind More by their overflow priority, never one alone, a priority's actions together.
  One Tab stop, a status at the end.
- Icons `forward` and `refresh`.

## 0.1.0-alpha.9 (2026-11-09)

A quick reply that carries its own controls and decides when it may be sent.

- `Composer` takes `leading`, a quick reply's own controls at the start of its last row before Send, and `canSend`,
  which decides whether Send sends in place of the text being non-empty.

## 0.1.0-alpha.8 (2026-11-09)

Choosing files a person already has, and a file viewer that keeps to the screen.

- Added: `FilePicker`, for choosing files that already exist in the person's spaces, such as Drive, to attach them
  without downloading and uploading them again (contract component `file-picker`). The kit knows no API: the host
  gives the spaces, lists a folder page by page (`list(space, path, cursor?)`), and receives the chosen entries with
  the space and path each was chosen in.
  - The selection holds across folders and spaces; the footer counts all of it, and a chip lists it, with Remove and
    Clear.
  - An optional `budget` (`usedBytes`, `limitBytes`, `cost`) is counted here: what is left after the selection, and
    a file that would go over is disabled with the host's words for it. `disabledReason` adds the host's own reasons.
    Attach is disabled with nothing chosen and while over.
  - A listbox with aria-multiselectable: Up, Down, Home and End move, Enter opens a folder, Space ticks a file,
    Backspace goes up, Escape cancels. The breadcrumb is a navigation landmark. A page further is asked for near the
    end of the list.
  - Loading, empty and error with Retry through `State`; a folder the person may not open (`FilePickerDenied` from
    `list`) is denied in place, the dialog staying open.
  - A dialog of fixed height on a wide screen; the whole screen on a phone, its foot kept at the bottom.
  - `kit.contract.json` does not declare it yet: no released design-tokens version has the entry.
- Fixed: the file viewer is never wider than the screen. A viewer bar wider than a phone widened the whole overlay;
  now the overlay is one column the screen's width, and the bar scrolls sideways in its place, its controls centred
  while they fit.
- `Modal` takes `initialFocus`, what takes the focus on opening when it is not the body's first control, and
  `className`, for a component drawn in it that has a layout of its own.

## 0.1.0-alpha.7 (2026-11-08)

An icon of its own for the important folder.

- Added: the `important` icon, a marker shaped as a label's chevron, for a mail client's important folder. The bell
  stays for notifications alone. The demo's mail folders show it after Starred.

## 0.1.0-alpha.6 (2026-11-08)

A file opens over the page, and every place that waits, finds nothing or is refused says so in one way.

- Added: `FileViewer`, the overlay a file's adapter goes inside. It draws no file itself.
  - The top bar has Close, the type badge and the name, then the caller's actions (Download, Print, Open separately),
    in a menu on a phone. Edit is there only when the caller passes it.
  - Close leaves the viewer, asking the caller first when there is unsaved work; Done returns from editing.
    Escape closes only while viewing.
  - Focus starts on Close, stays among what is drawn, and returns to what opened the viewer. The page behind does not
    scroll.
  - Arrows, swipes and side buttons move through a set of files. A field, an editor, or anything marked
    `data-viewer-keys` or `data-viewer-gestures` keeps its keys and gestures. A key held with Ctrl, Cmd or Alt is left
    to the browser.
  - Plus, minus and 0 call `onZoom`. The viewer bar, thumbnails and strip hold what the adapter gives.
  - `download`, `print` and `open-separately` join the icons.
  - `kit.contract.json` does not declare it yet: design-tokens v0.7.1 has no entry for it.
- Added: `State`, for loading, empty, error and denied, at a page's, a card's or a line's size, with the caller's
  title, description and action. Loading shows nothing until `STATE_DELAY_MS` (the `state-delay` token) has passed.
  `elevation-required` is declared not offered, since this kit's clients never elevate.
- Changed: the kit is checked against design-tokens v0.7.1, from v0.7.0.

## 0.1.0-alpha.5 (2026-11-04)

A field is drawn once.

- Fixed: `SignInForm`'s inputs carried the class of a field's frame, `cms-field`, so their box (a border, a fixed
  44px height, padding and a background) fell on the frame of every `TextField`, `Select` and `Toggle` too: each field
  drew two boxes, and its help text ran over the next label. The sign-in inputs are now `cms-signin-form__input`, and
  the frame is a column of label, box and help only. A page that styled the sign-in inputs as `.cms-field` styles
  them as `.cms-signin-form__input`.

## 0.1.0-alpha.4 (2026-11-02)

The kit's words come from the app, and the composer leaves an input method's Enter alone.

- Added: every word a component says can be given in the app's language, English where it is not.
  - `labels` on `IncomingCall`, `CallPanel` and `CallBar` (`CallLabels`, defaults `CALL_LABELS`);
  - `labels` on `SignInForm` (`SignInLabels`, `SIGN_IN_LABELS`) and `MailRow` (`MailRowLabels`, `MAIL_ROW_LABELS`);
  - `railLabel` on `AppShell`, `readLabel` on `ChatBubble`, `attachLabel` on `Composer`, `closeLabel` on `Modal`
    and `ConfirmDialog`, `dismissLabel` on `Toast` and `retryLabel` on `ErrorBanner`.
  The words that name someone or something take it as an argument (`onCallWith(name)`), so a language can place it.
- Changed: `AppShell`'s main area is a column: a section in it can fill the height (`flex: 1`), and a lone child does.
- Fixed: `Composer` no longer sends on Enter while an input method is composing (`isComposing`, or the composing key
  229 on browsers that do not set it). Typing Chinese, Japanese or Korean, Enter confirms the text.

## 0.1.0-alpha.3 (2026-10-30)

The Workspace's components, on design-tokens 0.6.0.

- Added: `AppShell` (the dark rail of sections with counts, the top bar with the server, search and account),
  `SearchField`, `Badge`, `FilterChips` (a radio group of pills), `SplitPanes` (two or three labelled panes),
  `MailRow`, `ChatBubble`, `Composer` (chat and quick reply), `IncomingCall`, `CallPanel`, `CallBar`, `SignInLayout`
  and `SignInForm`, and `Icon` with its set of 29 icons.
- Responsive by design, on the layout's tokens: desktop from 1200px (the full rail, three panes), tablet from 600px
  (an icons-only rail with each section's name as its tooltip, two panes), phone below 600px (a bottom tab bar, one
  pane at a time). `SplitPanes` takes `active`, the pane the person is in, and `back`, a link to the pane before
  it, shown where that pane is hidden; with the selection in the address, the browser's Back agrees. Sign-in fits
  every width, and every control is at least 44px at tablet and phone widths.
- A navy button keeps a visible 1px edge in dark (`button-chrome-border`).
- Changed: `Avatar` takes one of six tints from the name (`tintOf`), the same name always the same tint.
- Added: Inter (`./fonts.css`, SIL Open Font License 1.1) and the token file with the Workspace tokens, both from
  design-tokens 0.6.0, as the lock records.
- The demo gains a Workspace page per screen (Mail, Chat, Calls, Sign in), light and dark: `demo/workspace.html`.
  Mail shows the mailbox's folders as a tree, never labels. Each screen's place is in its address (`#mail/2` is
  Mail with its third message open).
- Checks: `check-breakpoints` (every media query width is a breakpoint token) and `check-layout` (every demo screen
  at 1440, 1024, 768 and 390px, light and dark, in headless Chrome: nothing passes the edge or scrolls sideways,
  and no control at touch widths is under 44px).

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

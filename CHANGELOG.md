# Changelog

All notable changes to `@coolms/ui-react` are listed here. Versions follow [semantic versioning](https://semver.org/).

## Unreleased

- `ScreenShell` `bar-hidden`: a reader's input counts only for a scroll of the element it was aimed at (its target inside it, or a key aimed at the whole page). A tap that opens a view, such as a conversation that then scrolls to its latest message, no longer folds the bar.

## 0.1.0-alpha.22 (2026-11-21)

The screen shell's bar steps aside only for the reader's own scroll, never for a scroll the host makes, and never moves with motion when reduced motion is set.

- `ScreenShell` `bar-hidden`: only a scroll that follows the reader's own input (a wheel, a touch, a key, a press on a scrollbar) moves the bar. A scroll the host makes itself, such as a conversation opening at its latest message, keeps it in view.
- `ScreenShell`: the bar's show and hide never animate when the reader prefers reduced motion.

## 0.1.0-alpha.21 (2026-11-21)

The kit on design tokens v0.11.0 (contract 0.6.0, with the served icon list): the screen shell steps its bar out of the way while scrolling down, one header at phone width, and the Workspace's served icon names.

- Tokens: the copy is design-tokens v0.11.0 (eea2e13), contract 0.6.0, and `contract/icons.json` is copied and pinned with it: the icon names the server's navigation trees use, each with the interfaces whose trees use it.
- `ScreenShell`: `bar-hidden` (contract 0.6.0). The bar and the filters step out of view while the content, or any pane in it that scrolls on its own, scrolls down past 48px, and come back on any scroll up, at the top, or when focus moves into the bar; never while searching, pulling or refreshing. `barHidden` hands the decision to the host. Collapsed rather than removed, so focus can still reach the bar.
- `AppShell` at phone width: while a screen shell is drawn in it, its own top bar gives way, so the screen's bar is the only header (contract 0.6.0: one header at phone width). A host no longer needs its own rule for it.
- `iconForName`: the served names the Workspace's trees use since the Chat and Drive trees: `arrow-left` (chevron-left), `pencil-square` (pencil), `cloud-upload` (the new `upload` icon), `people` (the new `users` icon), `file-earmark-word` and `file-earmark-spreadsheet` (file). A test reads `contract/icons.json` and fails, naming it, for any name listed for the Workspace that has no icon.
- `ScreenShell` / `usePull`: a pull starts only when every region that scrolls under the finger, up to the shell's content, is at its top. A list that scrolls in its own box inside the shell, scrolled down, takes a downward drag as its own scroll, not as a refresh.

## 0.1.0-alpha.20 (2026-11-20)

The server's icon names the folder menu and the image bar use, and a space kept for a name the kit does not know.

- `Icon`: `folder-plus`, `folder-x`, `user-check` and `user-x`, in the set's stroke style.
- `BOOTSTRAP_ICONS` / `iconForName`: `pencil` is `pencil`, `trash3` is `trash`, `folder-plus` and `folder-x` are themselves, `image` is `image`, `person-check` is `user-check`, and `person-x` is `user-x`.
- `NamedIcon` (new): a server's icon by its name, 18px by default, for a row of items. A name the table does not hold draws an empty space of the same size, so the labels beside it line up, and says so once per name in the console outside production. No name draws nothing.

## 0.1.0-alpha.19 (2026-11-20)

The screen shell at phone width, on design tokens 0.10.0 (contract 0.5.0).

- `ScreenShell` (contract `screen-shell`): one screen of a section at phone width. One bar: the section's navigation at its root, or Back named by the parent on a nested screen; the title; the section's search, then the shell's own icons (the bell, the avatar). Optional filter chips under it, exactly one selected. The content scrolls on its own and refreshes by a pull from its top (`onRefresh`, 64px); the primary action floats at the bottom right as one button or a menu of declared entries, and the content ends with room for it. While the section's search is open (`searching`), the bar is Close and the host's search field.
- `usePull`, `PULL_AT`, `usePullState`: the pull, shared; a `List` inside a shell draws it (state `pulled`) with the sync time, then the refreshing state.
- `List`: one row anatomy, flat on one surface with light separators, no border or card; a row may be `unread` (the title semibold) and carry a `count` under its meta.
- `Avatar`: `connection` (on one's own avatar, the live connection as its dot, said in words as its name and tooltip), `deleted` (a neutral person icon, never initials), and presence `busy`, drawn as away.
- Icons: `user`, a person.
- Tokens: the copy is design-tokens v0.10.0 (a075e93); only the components contract changed (the screen shell, its search part, the list's row and the avatar's states).

## 0.1.0-alpha.18 (2026-11-20)

A sender's own initials when a service sent on their behalf.

- `Avatar` / `initialsOf`: a trailing "via <service>" is left out before the initials are taken, so a message sent on someone's behalf shows the sender's own: "Valentina Zagnetova via LinkedIn" is VZ, not VL. Only a lowercase "via", as relays write it: "Maria Via Rossi" stays MR. Each initial is the word's first letter or digit, so a name in quotes ("'Anna Kowalska' via Partners") is AK.

## 0.1.0-alpha.17 (2026-11-19)

The pane toolbar always reaches More, and two icons of their own.

- `PaneToolbar`: More is always reached. In a row too narrow for its pinned actions and More, after the overflow, the pinned go behind More too, from the end of the row, and its menu lists them after the overflow; no action is cut off at the row's edge. One action alone goes behind More when no other can go with it and that alone lets the row fit (one keeping its label, without an icon).
- Icons: `envelope-open` draws an open envelope (`mail-open`), apart from `envelope`, and `clipboard` draws a clipboard (`copy`), so Show message and Copy source have their own icons.

## 0.1.0-alpha.16 (2026-11-19)

The design tokens 0.8.0 with their control heights, and the kit covering every entry of their contract 0.3.0.

- Tokens: the copy is design-tokens v0.8.0, with `--cms-control-height-sm` (32px), `-md` (40px; 44px on a coarse pointer) and `-lg` (44px). `tools/check-css.mjs` is its copy that keeps the coarse-pointer block.
- Control heights: a button, a text field and a select are `--cms-control-height-md`: 40px with a mouse, 44px on a touch screen, as the token says. A button's height is no longer set again by the window's width.
- `Notification`: one notification in a list (contract `notification`: unread, read, collapsed, expanded, with-action, row-action). Pressing the row reads it and follows only a row action the host can follow; a button action goes only from its button, after the text; the chevron opens the body and reads it.
- `FileViewer`: `state` draws loading, an error (Retry only when the caller gives it) or no preview (Download as its action) inside the content, the top bar staying; `editing.conflict` asks, above the editor, whether to overwrite the other version or keep both, and saves nothing on its own.
- `ContextMenu`: a refused or disabled item is described by its reason (`aria-describedby`), as the pane toolbar's disabled action is (contract `item-disabled`); an item's icon and words share one line.
- The kit declares `file-viewer`, `file-picker`, `pane-toolbar` and `notification` against the contract, state by state.
- `tools/check-layout.mjs`: below the desktop width the browser is a touch screen's (a coarse pointer, no hover), so a control's touch height is the one measured; the demo has a notifications screen.

## 0.1.0-alpha.15 (2026-11-18)

Resizable panes.

- `SplitPanes`: `sizes` gives the panes before the last a width, limits, a width to put back and a splitter's name; where every pane shows, a splitter is drawn after each. A splitter is a vertical separator with its width and limits, dragged by mouse, touch or pen, moved 16 px by the arrow keys, taken to its limits by Home and End, and put back by a double-click or Enter. `onResize` reports a move while it is dragged and once more when the drag or the key ends. The last pane is never narrower than `lastMin` (360 by default); as the window narrows the pane nearest it gives way first. Where fewer panes show, there is no splitter.
- `fitPanes(sizes, room, lastMin)`: the widths the panes take in a given room, as `SplitPanes` lays them out.

## 0.1.0-alpha.14 (2026-11-18)

Number, date and time fields, and a field of several lines, for forms the server declares.

- `TextField`: `type` adds `number`, `date`, `time` and `datetime-local`, native inputs, so a phone shows its own keyboard or picker and assistive technology reads them as what they are. The server's constraints are the input's own: `min`, `max`, `step`, `minLength`, `maxLength` and `required`. A number with a fractional or `any` step asks for the decimal keyboard. `locale` (the person's) is the input's language, and a read-only or pinned date or time is written out in it as the wall-clock value it is, with its ISO value in `data-value`; a value naming no real date or time is shown as given. While a date or time is edited, the device's picker shows the browser's own format.
- `writtenOut(type, value, locale)`: the same writing out, for a host.
- `TextArea`: several lines in the text field's frame and states, with `rows`, `minLength`, `maxLength`, `required` and `locale`.

## 0.1.0-alpha.13 (2026-11-17)

The viewer's side arrows say where they go, and the next one stands clear of the scrollbar.

- `FileViewer`: each side arrow's label (`siblings.previousLabel` / `nextLabel`) is also its tooltip, so the caller's words ("Next attachment: Receipt.pdf") show on hover. The next arrow stands 20px further in from the content's right edge, clear of the content's own vertical scrollbar.

## 0.1.0-alpha.12 (2026-11-16)

A disabled action's reason is read out with it, and a press shows it.

- `PaneToolbar`: a disabled action's reason describes it (`aria-describedby`), so it is read out with the action, and a press shows it as hover and focus do, until focus leaves or Escape. A press still runs nothing.

## 0.1.0-alpha.11 (2026-11-15)

Show original stays in More, and a toolbar's labels give way one by one.

- `PaneToolbar`: as the pane narrows, labels hide one by one, in the overflow order (lower priority first, a
  priority's actions together), then the pinned actions' from the end of the row; only once every label is hidden do
  actions go behind More, in the same order, never one alone. They come back in the reverse order. An action hiding its
  label keeps it as its tooltip. The row is marked `cms-pane-toolbar--labels-partly-hidden` between the two, the
  contract's new `labels-partly-hidden` state.
- `PaneToolbar`: the classes named as the contract names them. An action whose label is hidden is
  `cms-pane-toolbar__action--bare` (renamed `--icon` to `--bare`), and an action drawn without an icon is
  `cms-pane-toolbar__action--text`, the same in both kits.
- `PaneToolbar`: `overflow: 0` means menu only. The action is never drawn in the row, at any width, and always sits behind
  More, first in its menu. More is drawn for it even when it is alone. Its label takes no part in the giving way, and the
  rule that one action never goes behind More alone counts only the actions that could have stayed in the row.
- `Icon`: `file-code`, a file with code's angle brackets, for the server's `file-earmark-code` (Show original).

## 0.1.0-alpha.10 (2026-11-10)

The row of actions at the top of a pane, drawn from the server's action nodes.

- `ContextMenu` takes `focus`, the item focused as it opens; `PaneToolbar`'s More opens its menu on the last item with Up.
- `PaneToolbar`, the contract's `pane-toolbar`: the one row of actions at the top of a pane, the
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
- Changed: the README's install line names no version, and says to use 0.1.0-alpha.2 or later.

## 0.1.0-alpha.1 (2026-10-23)

The first pre-release. The package carries `design-tokens.lock.json` (#1).

- The 15 components of the CoolMS UI contract, each in every state the contract names. `elevation-required` is not
  offered.
- Server helpers for the contract's reactions R1 to R6: `offerFor`, `readRefusal`, `useReread`, `readConflict` and
  `needsClientUpdate`.
- `kit.css`, styled only with `--cms-*` tokens.
- The token file, the UI contract and its checker, all copied from `coolms/design-tokens` v0.4.0 and pinned in
  `design-tokens.lock.json`.
- A published build: one ES module plus type declarations. React is left to the application.
- A demo page with every state, in light and dark.

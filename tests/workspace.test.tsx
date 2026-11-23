import { act, fireEvent, render, screen } from '@testing-library/react';
import kitCss from '../src/kit.css?raw';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
    AppShell,
    Avatar,
    Badge,
    CallBar,
    CallPanel,
    ChatBubble,
    Composer,
    ConfirmDialog,
    FilterChips,
    ICON_NAMES,
    Icon,
    iconForName,
    IncomingCall,
    MailRow,
    SearchField,
    SignInForm,
    SignInLayout,
    SplitPanes,
    fitPanes,
    type PaneSize,
    tintOf,
} from '../src';

describe('Icon', () => {
    it('is decorative beside text, and named when it stands alone', () => {
        const { container } = render(<Icon name="mail" />);
        expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
        render(<Icon name="paperclip" label="Has an attachment" />);
        expect(screen.getByRole('img', { name: 'Has an attachment' })).toBeInTheDocument();
    });

    it('draws every name of the set', () => {
        for (const name of ICON_NAMES) {
            const { container, unmount } = render(<Icon name={name} />);
            expect(container.querySelector('svg')?.childNodes.length, name).toBeGreaterThan(0);
            unmount();
        }
        expect(ICON_NAMES).toContain('phone-off');
    });

    it('draws a read envelope apart from an unread one, and a clipboard for copying', () => {
        expect(iconForName('envelope')).toBe('mail');
        expect(iconForName('envelope-open')).toBe('mail-open');
        expect(iconForName('clipboard')).toBe('copy');
    });
});

describe('Badge', () => {
    it('shows the count and says what it counts; nothing for zero; caps at max', () => {
        const { rerender, container } = render(<Badge count={12} label="12 unread" />);
        expect(screen.getByText('12 unread')).toBeInTheDocument();
        expect(container).toHaveTextContent('12');
        rerender(<Badge count={150} label="150 unread" />);
        expect(container).toHaveTextContent('99+');
        rerender(<Badge count={0} label="none" />);
        expect(container).toBeEmptyDOMElement();
    });
});

describe('Avatar tint', () => {
    it('is the same for the same name, and one of six', () => {
        expect(tintOf('Anna Kowalska')).toBe(tintOf('  anna kowalska '));
        for (const name of ['A', 'Tomasz Wójcik', 'Olga Lis', 'Pavel Sidorov', 'Марек']) {
            expect(tintOf(name)).toBeGreaterThanOrEqual(1);
            expect(tintOf(name)).toBeLessThanOrEqual(6);
        }
        const { container } = render(<Avatar name="Anna Kowalska" />);
        expect(container.querySelector('.cms-avatar')).toHaveClass(`cms-avatar--tint-${tintOf('Anna Kowalska')}`);
    });
});

describe('AppShell', () => {
    const rail = [
        { id: 'mail', label: 'Mail', icon: 'mail' as const, href: '#mail', badge: { count: 12, label: '12 unread' } },
        { id: 'chat', label: 'Chat', icon: 'chat' as const, href: '#chat' },
    ];

    it('marks the open section as the current page and names its count', () => {
        render(<AppShell product="CoolMS Workspace" mark="C" rail={rail} active="mail">content</AppShell>);
        const nav = screen.getByRole('navigation', { name: 'Sections' });
        expect(nav).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Mail/ })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: /Chat/ })).not.toHaveAttribute('aria-current');
        expect(screen.getByRole('link', { name: /Mail/ })).toHaveTextContent('12 unread');
        expect(screen.getByRole('main')).toHaveTextContent('content');
    });

    it('navigates through onNavigate instead of the link, when given', async () => {
        const onNavigate = vi.fn();
        render(<AppShell product="P" mark="C" rail={rail} active="mail" onNavigate={onNavigate}>x</AppShell>);
        await userEvent.click(screen.getByRole('link', { name: /Chat/ }));
        expect(onNavigate).toHaveBeenCalledWith('chat');
    });

    it("names each section on its link as well, for the icons-only rail's tooltip", () => {
        render(<AppShell product="P" mark="C" rail={rail} active="mail">x</AppShell>);
        expect(screen.getByRole('link', { name: /Mail/ })).toHaveAttribute('title', 'Mail');
        expect(screen.getByRole('link', { name: /Chat/ })).toHaveAttribute('title', 'Chat');
    });
});

describe('SearchField', () => {
    it('is a labelled search landmark that submits its text', async () => {
        const onSearch = vi.fn();
        function Controlled() {
            const [v, setV] = useState('');
            return <SearchField label="Search" placeholder="Search mail" value={v} onChange={setV} onSearch={onSearch} />;
        }
        render(<Controlled />);
        expect(screen.getByRole('search')).toBeInTheDocument();
        await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'agenda{Enter}');
        expect(onSearch).toHaveBeenCalledWith('agenda');
    });
});

describe('FilterChips', () => {
    it('is a radio group; a press and the arrow keys change the filter', async () => {
        function Controlled() {
            const [v, setV] = useState('all');
            return <FilterChips label="Show" value={v} onChange={setV} options={[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'files', label: 'Attachments' }]} />;
        }
        render(<Controlled />);
        expect(screen.getByRole('radiogroup', { name: 'Show' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
        await userEvent.click(screen.getByRole('radio', { name: 'Unread' }));
        expect(screen.getByRole('radio', { name: 'Unread' })).toBeChecked();
        await userEvent.keyboard('{ArrowRight}');
        expect(screen.getByRole('radio', { name: 'Attachments' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Attachments' })).toHaveFocus();
        await userEvent.keyboard('{ArrowRight}');
        expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
    });

    it('marks the selected chip with a check as well as its fill, and only that one', async () => {
        function Controlled() {
            const [v, setV] = useState('all');
            return <FilterChips label="Show" value={v} onChange={setV} options={[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }]} />;
        }
        render(<Controlled />);
        const marks = () => screen.getAllByRole('radio').map(r => r.querySelector('svg') !== null);
        expect(marks()).toEqual([true, false]);
        await userEvent.click(screen.getByRole('radio', { name: 'Unread' }));
        expect(marks()).toEqual([false, true]);
    });

    // jsdom lays nothing out: the row's widths and scroll are given here, as a browser would measure them.
    const sized = (el: HTMLElement, box: { client: number; scroll: number; left: number }) => {
        Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => box.client });
        Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => box.scroll });
        Object.defineProperty(el, 'scrollLeft', { configurable: true, get: () => box.left, set: (v: number) => { box.left = v; } });
    };
    const five = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'files', label: 'Attachments' }, { id: 'flagged', label: 'Flagged' }, { id: 'mine', label: 'To me' }];

    it('one line that scrolls: the clipped edge fades only while there is more past it, at the start and at the end', () => {
        render(<FilterChips label="Show" value="all" onChange={() => undefined} options={five} />);
        const row = screen.getByRole('radiogroup', { name: 'Show' });
        const box = { client: 200, scroll: 200, left: 0 };
        sized(row, box);
        fireEvent.scroll(row);
        expect(row.className).toBe('cms-chips');
        box.scroll = 500;
        fireEvent.scroll(row);
        expect(row).toHaveClass('is-past-end');
        expect(row).not.toHaveClass('is-past-start');
        box.left = 150;
        fireEvent.scroll(row);
        expect(row).toHaveClass('is-past-start');
        expect(row).toHaveClass('is-past-end');
        box.left = 300;
        fireEvent.scroll(row);
        expect(row).toHaveClass('is-past-start');
        expect(row).not.toHaveClass('is-past-end');
        expect(kitCss).toMatch(/\.cms-chips \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;/);
        expect(kitCss).toMatch(/\.cms-chips\.is-past-end \{ mask-image:/);
        // Right to left, the start is the right edge: its masks run the other way.
        expect(kitCss).toMatch(/\.cms-chips\.is-past-start:dir\(rtl\) \{ mask-image: linear-gradient\(to left,/);
    });

    it('measures again when a chip changes size while the row does not (a font arriving)', () => {
        const watched: Element[] = [];
        const callbacks: Array<() => void> = [];
        const real = globalThis.ResizeObserver;
        globalThis.ResizeObserver = class {
            constructor(cb: () => void) { callbacks.push(cb); }
            observe(el: Element) { watched.push(el); }
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;
        try {
            render(<FilterChips label="Show" value="all" onChange={() => undefined} options={five} />);
            const row = screen.getByRole('radiogroup', { name: 'Show' });
            expect(watched).toContain(row);
            for (const chip of screen.getAllByRole('radio')) expect(watched).toContain(chip);
            const box = { client: 200, scroll: 200, left: 0 };
            sized(row, box);
            box.scroll = 400;
            act(() => callbacks.forEach((cb) => cb()));
            expect(row).toHaveClass('is-past-end');
        } finally {
            globalThis.ResizeObserver = real;
        }
    });

    it('a chip reached by key, or chosen by a press, scrolls fully into view', async () => {
        function Controlled() {
            const [v, setV] = useState('all');
            return <FilterChips label="Show" value={v} onChange={setV} options={five} />;
        }
        render(<Controlled />);
        const seen: string[] = [];
        for (const chip of screen.getAllByRole('radio')) {
            chip.scrollIntoView = () => { seen.push(chip.textContent ?? ''); };
        }
        await userEvent.click(screen.getByRole('radio', { name: 'Flagged' }));
        await userEvent.keyboard('{ArrowRight}');
        expect(seen).toEqual(['Flagged', 'To me']);
    });
});

describe('SplitPanes', () => {
    it('labels each pane', () => {
        render(<SplitPanes panes={[{ label: 'Folders', content: 'f' }, { label: 'Messages', content: 'm' }, { label: 'Message', content: 'r' }]} />);
        expect(screen.getAllByRole('region').map(r => r.getAttribute('aria-label'))).toEqual(['Folders', 'Messages', 'Message']);
    });

    const three = [{ label: 'Folders', content: 'f' }, { label: 'Messages', content: 'm' }, { label: 'Message', content: 'r' }] as const;
    const offsets = () => screen.getAllByRole('region').map(r => r.getAttribute('data-offset'));

    it('marks how far each pane is from the active one, the last pane by default', () => {
        const { container, unmount } = render(<SplitPanes panes={three} />);
        expect(container.firstElementChild).toHaveAttribute('data-active', '2');
        expect(offsets()).toEqual(['2', '1', '0']);
        unmount();
        render(<SplitPanes panes={three} active={1} />);
        expect(offsets()).toEqual(['1', '0', '-1']);
    });

    it('keeps the active index within the panes', () => {
        const { container } = render(<SplitPanes panes={three} active={7} />);
        expect(container.firstElementChild).toHaveAttribute('data-active', '2');
    });

    it('puts Back, a link to the pane before, in the active pane only', () => {
        render(<SplitPanes panes={three} active={2} back={{ label: 'Inbox', href: '#mail' }} />);
        const back = screen.getByRole('link', { name: 'Inbox' });
        expect(back).toHaveAttribute('href', '#mail');
        expect(screen.getByRole('region', { name: 'Message' })).toContainElement(back);
        expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('draws no Back without one given', () => {
        render(<SplitPanes panes={three} active={1} />);
        expect(screen.queryByRole('link')).toBeNull();
    });
});

describe('MailRow', () => {
    it('reads as one button with who, what, when; unread and attachment named; selected marked', async () => {
        const onOpen = vi.fn();
        render(<MailRow from="Anna Kowalska" subject="Partner demo" preview="Can we walk through..." time="09:42" unread hasAttachment selected onOpen={onOpen} />);
        const row = screen.getByRole('button', { name: /Anna Kowalska/ });
        expect(row).toHaveTextContent('Partner demo');
        expect(row).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('img', { name: 'Unread' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Has an attachment' })).toBeInTheDocument();
        await userEvent.click(row);
        expect(onOpen).toHaveBeenCalled();
    });

    it('is three lines at every width: the sender and the time, the subject, the preview, on the three-line token', () => {
        const { container } = render(<MailRow from="Anna" subject="Partner demo" preview="Can we walk through" time="09:42" unread onOpen={() => undefined} />);
        const body = container.querySelector('.cms-mail-row__body')!;
        expect(Array.from(body.children).map((c) => c.className)).toEqual(['cms-mail-row__line', 'cms-mail-row__line', 'cms-mail-row__preview']);
        expect(body.children[1]!.querySelector('.cms-mail-row__subject')).toHaveTextContent('Partner demo');
        expect(body.children[2]).toHaveTextContent('Can we walk through');
        expect(container.querySelectorAll('.cms-mail-row__preview')).toHaveLength(1);
        // One rule at every width: the three-line token, 10px above and below, the three sizes at 1.5, 2px apart.
        expect(kitCss).toMatch(/\.cms-mail-row \{[^}]*min-height: var\(--cms-list-row-height-three-line\);[^}]*padding: 10px var\(--cms-space-4\);/);
        expect(kitCss).toMatch(/\.cms-mail-row__body \{[^}]*gap: 2px;[^}]*line-height: 1\.5;/);
        expect(kitCss).toMatch(/\.cms-mail-row__from \{[^}]*font-size: var\(--cms-font-size-body\);/);
        expect(kitCss).toMatch(/\.cms-mail-row__subject \{[^}]*font-size: var\(--cms-font-size-meta\);/);
        expect(kitCss).toMatch(/\.cms-mail-row__preview \{[^}]*font-size: var\(--cms-font-size-label\);/);
        // No width redraws it: the compact heights are for the other lists.
        expect(kitCss).not.toMatch(/\n\s+\.cms-mail-row[ _{.:]/);
        expect(kitCss).not.toMatch(/cms-mail-row[^}]*list-row-height-(two-line|phone)/);
    });
});

describe('ChatBubble', () => {
    it('places a received and a sent message, and says when a sent one was read', () => {
        const { container } = render(<>
            <ChatBubble direction="in" time="09:51">Morning!</ChatBubble>
            <ChatBubble direction="out" time="09:53" read>Yes.</ChatBubble>
        </>);
        expect(container.querySelector('.cms-bubble--in')).toHaveTextContent('Morning!');
        expect(container.querySelector('.cms-bubble--out')).toHaveTextContent('09:53 · Read');
    });
});

describe('Composer', () => {
    it('labels the text; Enter sends a chat message, Shift+Enter does not; empty does not send', async () => {
        const onSend = vi.fn();
        const onAttach = vi.fn();
        function Controlled() {
            const [v, setV] = useState('');
            return <Composer label="Message Anna" value={v} onChange={setV} onSend={onSend} onAttach={onAttach} />;
        }
        render(<Controlled />);
        const box = screen.getByRole('textbox', { name: 'Message Anna' });
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        await userEvent.type(box, '{Enter}');
        expect(onSend).not.toHaveBeenCalled();
        await userEvent.type(box, 'Hi{Shift>}{Enter}{/Shift}');
        expect(onSend).not.toHaveBeenCalled();
        await userEvent.type(box, '{Enter}');
        expect(onSend).toHaveBeenCalledTimes(1);
        await userEvent.click(screen.getByRole('button', { name: 'Attach a file' }));
        expect(onAttach).toHaveBeenCalled();
    });

    it('a quick reply shows its title and sends with its button', async () => {
        const onSend = vi.fn();
        render(<Composer variant="reply" label="Quick reply to Anna Kowalska" value="Thanks" onChange={() => undefined} onSend={onSend} />);
        expect(screen.getByText('Quick reply to Anna Kowalska')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: /Send/ }));
        expect(onSend).toHaveBeenCalled();
    });

    it("a quick reply's own controls sit in its last row, before Send", () => {
        render(<Composer variant="reply" label="Quick reply to Anna Kowalska" value="" onChange={() => undefined} onSend={() => undefined} leading={<button type="button">Attach files</button>} />);
        const attach = screen.getByRole('button', { name: 'Attach files' });
        const send = screen.getByRole('button', { name: /Send/ });
        expect(attach.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(attach.closest('.cms-composer__leading')).not.toBeNull();
    });

    it('canSend decides instead of the text: a reply with files and no text goes, one over its limit does not', async () => {
        const onSend = vi.fn();
        const { rerender } = render(<Composer variant="reply" label="Quick reply" value="" onChange={() => undefined} onSend={onSend} canSend />);
        await userEvent.click(screen.getByRole('button', { name: /Send/ }));
        expect(onSend).toHaveBeenCalledTimes(1);
        rerender(<Composer variant="reply" label="Quick reply" value="Thanks" onChange={() => undefined} onSend={onSend} canSend={false} />);
        expect(screen.getByRole('button', { name: /Send/ })).toBeDisabled();
    });

    it('canSend decides for Enter in a chat too: not with text when false, and with no text when true', async () => {
        const onSend = vi.fn();
        const { rerender } = render(<Composer label="Message Anna" value="Hi" onChange={() => undefined} onSend={onSend} canSend={false} />);
        await userEvent.type(screen.getByRole('textbox', { name: 'Message Anna' }), '{Enter}');
        expect(onSend).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        rerender(<Composer label="Message Anna" value="" onChange={() => undefined} onSend={onSend} canSend />);
        await userEvent.type(screen.getByRole('textbox', { name: 'Message Anna' }), '{Enter}');
        expect(onSend).toHaveBeenCalledTimes(1);
    });
});

describe('Calls', () => {
    it('an incoming call is an alert dialog with Accept and Decline', async () => {
        const onAccept = vi.fn();
        const onDecline = vi.fn();
        render(<IncomingCall name="Anna Kowalska" media="audio" onAccept={onAccept} onDecline={onDecline} />);
        expect(screen.getByRole('alertdialog', { name: 'Incoming audio call from Anna Kowalska' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
        await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
        expect(onAccept).toHaveBeenCalled();
        expect(onDecline).toHaveBeenCalled();
    });

    it('the panel names the call, its time and connection; mute and speaker are toggles', async () => {
        const onToggleMute = vi.fn();
        const onHangUp = vi.fn();
        render(<CallPanel name="Anna Kowalska" duration="04:12" connection="good" you={{ name: 'Ada Lovelace', speaking: true }} muted speaker={false}
            onToggleMute={onToggleMute} onToggleSpeaker={() => undefined} onHangUp={onHangUp} />);
        expect(screen.getByRole('region', { name: 'Call with Anna Kowalska' })).toBeInTheDocument();
        expect(screen.getByText('Good connection')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Speaker' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByRole('button', { name: 'Add person' })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Unmute' }));
        await userEvent.click(screen.getByRole('button', { name: 'Hang up' }));
        expect(onToggleMute).toHaveBeenCalled();
        expect(onHangUp).toHaveBeenCalled();
    });

    it('the bar keeps the call in reach from another section', async () => {
        const onReturn = vi.fn();
        render(<CallBar name="Anna Kowalska" duration="04:12" muted={false} onToggleMute={() => undefined} onReturn={onReturn} onHangUp={() => undefined} />);
        expect(screen.getByRole('region', { name: 'Call with Anna Kowalska' })).toHaveTextContent('On a call with Anna Kowalska');
        expect(screen.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: 'Hang up' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Return to call' }));
        expect(onReturn).toHaveBeenCalled();
    });
});

describe('Sign-in', () => {
    it('labels its fields, shows the password on request, submits both, and announces a refusal', async () => {
        const onSubmit = vi.fn();
        render(<SignInLayout mark="C" product="CoolMS" headline="One sign-in for Admin and Workspace" lead="Mail, chat, calls."
            features={[{ icon: 'mail', label: 'Mail' }]}>
            <SignInForm server="demo.coolms.com" onSubmit={onSubmit} forgotHref="#forgot" createHref="#create" error="Wrong password." />
        </SignInLayout>);
        await userEvent.type(screen.getByLabelText('Email or username'), 'ada@example.com');
        const password = screen.getByLabelText('Password');
        await userEvent.type(password, 'secret');
        expect(password).toHaveAttribute('type', 'password');
        await userEvent.click(screen.getByRole('button', { name: 'Show' }));
        expect(password).toHaveAttribute('type', 'text');
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(onSubmit).toHaveBeenCalledWith('ada@example.com', 'secret');
        expect(screen.getByRole('alert')).toHaveTextContent('Wrong password.');
        expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '#forgot');
        expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument();
    });
});

describe('the words, from the app', () => {
    it('each component says the words it is given, English where none is', () => {
        const { unmount } = render(
            <>
                <ChatBubble direction="out" time="09:53" read readLabel="Прочитано">Hi</ChatBubble>
                <IncomingCall name="Anna" media="audio" onAccept={() => undefined} onDecline={() => undefined} labels={{ accept: 'Принять', decline: 'Отклонить' }} />
                <CallBar name="Anna" duration="04:12" muted={false} onToggleMute={() => undefined} onReturn={() => undefined} onHangUp={() => undefined} labels={{ onCallWith: (name) => `Звонок: ${name}`, returnToCall: 'Вернуться' }} />
                <SignInForm server="demo.coolms.com" onSubmit={() => undefined} labels={{ identifier: 'Логин' }} />
            </>,
        );
        expect(screen.getByText(/Прочитано/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Принять' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Отклонить' })).toBeInTheDocument();
        expect(screen.getByText('Звонок: Anna')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Вернуться' })).toBeInTheDocument();
        expect(screen.getByLabelText('Логин')).toBeInTheDocument();
        // Not given: English.
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('alertdialog', { name: 'Incoming audio call from Anna' })).toBeInTheDocument();
        unmount();
    });

    it('a word given as undefined is the English one, never blank', () => {
        render(<IncomingCall name="Anna" media="audio" onAccept={() => undefined} onDecline={() => undefined} labels={{ accept: undefined, decline: 'Отклонить' }} />);
        expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Отклонить' })).toBeInTheDocument();
    });

    it('a question\'s close button is named in the app\'s language, "Close" where none is given', () => {
        const { unmount } = render(<ConfirmDialog open title="Удалить?" closeLabel="Закрыть" onConfirm={() => undefined} onCancel={() => undefined} />);
        expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
        unmount();
        render(<ConfirmDialog open title="Delete?" onConfirm={() => undefined} onCancel={() => undefined} />);
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
});

describe('Composer and input methods', () => {
    it('Enter while an input method composes is the composition\'s: nothing is sent', async () => {
        const onSend = vi.fn();
        render(<Composer label="Message Anna" value="你好" onChange={() => undefined} onSend={onSend} />);
        const box = screen.getByLabelText('Message Anna');
        box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
        box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }));
        expect(onSend).not.toHaveBeenCalled();
        box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(onSend).toHaveBeenCalledTimes(1);
    });
});

describe('SplitPanes with splitters', () => {
    // jsdom has no PointerEvent: one built on its MouseEvent carries the button and the position a drag reads.
    if (typeof window.PointerEvent === 'undefined') {
        class TestPointerEvent extends MouseEvent {
            readonly pointerId: number;
            constructor(type: string, init: PointerEventInit = {}) {
                super(type, init);
                this.pointerId = init.pointerId ?? 1;
            }
        }
        (window as unknown as { PointerEvent: typeof TestPointerEvent }).PointerEvent = TestPointerEvent;
    }
    const folders: PaneSize = { width: 230, min: 200, max: 380, reset: 230, label: 'Resize folders' };
    const list: PaneSize = { width: 340, min: 280, max: 620, reset: 340, label: 'Resize list' };
    const panes = [{ label: 'Folders', content: 'f' }, { label: 'Messages', content: 'm' }, { label: 'Message', content: 'r' }] as const;

    function Sized({ onResize }: { readonly onResize: (i: number, w: number, done: boolean) => void }) {
        const [widths, setWidths] = useState([230, 340]);
        return (
            <SplitPanes
                panes={panes}
                sizes={[{ ...folders, width: widths[0]! }, { ...list, width: widths[1]! }]}
                onResize={(i, w, done) => {
                    setWidths((was) => was.map((x, j) => (j === i ? w : x)));
                    onResize(i, w, done);
                }}
            />
        );
    }

    it('draws one named separator after each sized pane, with its width and limits, and the widths on the grid', () => {
        const { container } = render(<SplitPanes panes={panes} sizes={[folders, list]} />);
        const [a, b] = screen.getAllByRole('separator');
        expect(a).toHaveAccessibleName('Resize folders');
        expect(a).toHaveAttribute('aria-orientation', 'vertical');
        expect(a).toHaveAttribute('aria-valuenow', '230');
        expect(a).toHaveAttribute('aria-valuemin', '200');
        expect(a).toHaveAttribute('aria-valuemax', '380');
        expect(b).toHaveAccessibleName('Resize list');
        expect(b).toHaveAttribute('aria-valuenow', '340');
        const grid = container.querySelector('.cms-panes') as HTMLElement;
        expect(grid).toHaveClass('cms-panes--sized');
        expect(grid.style.getPropertyValue('--split-pane-0')).toBe('230px');
        expect(grid.style.getPropertyValue('--split-pane-end-1')).toBe('570px');
    });

    it('no splitter unless every pane before the last is sized', () => {
        render(<SplitPanes panes={panes} sizes={[folders]} />);
        expect(screen.queryByRole('separator')).toBeNull();
    });

    it('arrows move 16 px, Home and End go to the limits, Enter and a double-click put it back; each one is done', async () => {
        const onResize = vi.fn();
        render(<Sized onResize={onResize} />);
        const a = screen.getAllByRole('separator')[0]!;
        a.focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onResize).toHaveBeenLastCalledWith(0, 246, true);
        expect(a).toHaveAttribute('aria-valuenow', '246');
        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
        expect(onResize).toHaveBeenLastCalledWith(0, 214, true);
        await userEvent.keyboard('{End}');
        expect(onResize).toHaveBeenLastCalledWith(0, 380, true);
        await userEvent.keyboard('{ArrowRight}');
        expect(onResize).toHaveBeenLastCalledWith(0, 380, true);
        await userEvent.keyboard('{Home}');
        expect(onResize).toHaveBeenLastCalledWith(0, 200, true);
        await userEvent.keyboard('{Enter}');
        expect(onResize).toHaveBeenLastCalledWith(0, 230, true);
        await userEvent.keyboard('{End}');
        await userEvent.dblClick(a);
        expect(onResize).toHaveBeenLastCalledWith(0, 230, true);
    });

    it('a drag reports as it moves, within the limits, and once more when it ends', () => {
        const onResize = vi.fn();
        render(<Sized onResize={onResize} />);
        const b = screen.getAllByRole('separator')[1]!;
        fireEvent.pointerDown(b, { button: 2, clientX: 600, pointerId: 1 });
        fireEvent.pointerMove(b, { clientX: 650, pointerId: 1 });
        fireEvent.pointerUp(b, { clientX: 650, pointerId: 1 });
        expect(onResize).not.toHaveBeenCalled();
        fireEvent.pointerDown(b, { button: 0, clientX: 600, pointerId: 1 });
        fireEvent.pointerMove(b, { clientX: 650, pointerId: 1 });
        expect(onResize).toHaveBeenLastCalledWith(1, 390, false);
        fireEvent.pointerMove(b, { clientX: 2000, pointerId: 1 });
        expect(onResize).toHaveBeenLastCalledWith(1, 620, false);
        fireEvent.pointerUp(b, { clientX: 2000, pointerId: 1 });
        expect(onResize).toHaveBeenLastCalledWith(1, 620, true);
        expect(onResize.mock.calls.filter((c) => c[2] === true)).toHaveLength(1);
    });

    it('as the room narrows, the pane nearest the last gives way first, then the one before, never under their least', () => {
        expect(fitPanes([folders, list], 1500, 360)).toEqual([230, 340]);
        expect(fitPanes([folders, list], 900, 360)).toEqual([230, 310]);
        expect(fitPanes([folders, list], 800, 360)).toEqual([200, 280]);
        expect(fitPanes([folders, list], 500, 360)).toEqual([200, 280]);
        expect(fitPanes([{ ...folders, width: 999 }, { ...list, width: 10 }], 2000, 360)).toEqual([380, 280]);
    });
});

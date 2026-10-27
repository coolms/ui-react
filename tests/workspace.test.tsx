import { render, screen } from '@testing-library/react';
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
    FilterChips,
    ICON_NAMES,
    Icon,
    IncomingCall,
    MailRow,
    SearchField,
    SignInForm,
    SignInLayout,
    SplitPanes,
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
});

describe('SplitPanes', () => {
    it('labels each pane', () => {
        render(<SplitPanes panes={[{ label: 'Folders', content: 'f' }, { label: 'Messages', content: 'm' }, { label: 'Message', content: 'r' }]} />);
        expect(screen.getAllByRole('region').map(r => r.getAttribute('aria-label'))).toEqual(['Folders', 'Messages', 'Message']);
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

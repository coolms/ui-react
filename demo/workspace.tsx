import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/fonts/inter.css';
import '../src/tokens/coolms-tokens.css';
import '../src/kit.css';
import './workspace.css';
import {
    AppShell,
    Avatar,
    Badge,
    CallBar,
    CallPanel,
    ChatBubble,
    Composer,
    EmptyState,
    FilterChips,
    Icon,
    IncomingCall,
    MailRow,
    SearchField,
    SignInForm,
    SignInLayout,
    SplitPanes,
    type RailItem,
} from '../src';

/** The demo's pages, one per mockup, by the address's hash; the theme by `?theme=dark`. */
type Page = 'mail' | 'chat' | 'calls' | 'signin';

const RAIL: readonly RailItem[] = [
    { id: 'mail', label: 'Mail', icon: 'mail', href: '#mail', badge: { count: 12, label: '12 unread' } },
    { id: 'chat', label: 'Chat', icon: 'chat', href: '#chat', badge: { count: 3, label: '3 unread' } },
    { id: 'calls', label: 'Calls', icon: 'phone', href: '#calls' },
];

function Shell({ active, children }: { active: Page; children: ReactNode }): ReactNode {
    const [query, setQuery] = useState('');
    return (
        <AppShell
            product={<>CoolMS <span style={{ fontWeight: 400, color: 'var(--cms-text-body)' }}>Workspace</span></>}
            mark="C"
            rail={RAIL}
            active={active}
            server={<button type="button" className="cms-server-switch" aria-label="Server: demo.coolms.com. Switch server"><Icon name="server" size={18} />demo.coolms.com<Icon name="chevron-down" size={16} /></button>}
            search={<SearchField label="Search" placeholder="Search mail, chats, people and files" value={query} onChange={setQuery} />}
            account={<>
                <button type="button" className="cms-icon-button" aria-label="Notifications"><Icon name="bell" /></button>
                <Avatar name="Ada Lovelace" presence="online" size={40} />
            </>}
        >
            {children}
        </AppShell>
    );
}

const MAIL = [
    { from: 'Anna Kowalska', subject: 'Partner demo on Thursday', preview: 'Can we walk through the Workspace and installing a module?', time: '09:42', unread: true, hasAttachment: true },
    { from: 'Tomasz Wójcik', subject: 'Re: Warsaw office lease', preview: 'The landlord sent the final version. Two clauses changed.', time: '08:15', unread: true, hasAttachment: true },
    { from: 'CoolMS Notifications', subject: 'Your access to Workspace is ready', preview: 'Sign in at demo.coolms.com/workspace, or add the server in the app.', time: '07:30' },
    { from: 'Olga Lis', subject: 'Design review: Workspace UI kit', preview: 'Buttons, fields, lists and the call panel are ready for review.', time: 'Yesterday', hasAttachment: true },
    { from: 'Pavel Sidorov', subject: 'Invoice draft for October', preview: 'Please check the hours before I send it.', time: 'Yesterday', hasAttachment: true },
    { from: 'Marek Nowak', subject: 'Lunch next week?', preview: 'I will be in Warsaw on Tuesday and Wednesday.', time: 'Mon' },
];

/** Mail's place, from the address: the folders, the list (`#mail`), or one message (`#mail/<n>`). */
function MailPage({ sub }: { readonly sub: string }): ReactNode {
    const [filter, setFilter] = useState('all');
    const [reply, setReply] = useState('');
    const opened = /^\d+$/.test(sub) && Number(sub) < MAIL.length ? Number(sub) : null;
    const active = sub === 'folders' ? 0 : opened === null ? 1 : 2;
    const back = active === 2 ? { label: 'Inbox', href: '#mail' } : active === 1 ? { label: 'Folders', href: '#mail/folders' } : undefined;
    const folders: Array<[string, string, number?]> = [['inbox', 'Inbox', 12], ['star', 'Starred'], ['send', 'Sent'], ['file', 'Drafts', 2], ['archive', 'Archive'], ['info', 'Spam'], ['trash', 'Trash']];
    const message = opened === null ? null : MAIL[opened]!;
    return (
        <Shell active="mail">
            <SplitPanes active={active} {...(back ? { back } : {})} panes={[
                {
                    label: 'Folders',
                    content: (
                        <div className="ws-folders">
                            <button type="button" className="cms-button cms-button--chrome ws-compose"><Icon name="pencil" size={18} />Compose</button>
                            <div className="ws-mailbox">
                                <Avatar name="Work mail" size={36} />
                                <span className="ws-mailbox__name"><strong>Work mail</strong><span className="ws-mailbox__address">ada@example.com</span></span>
                                <Icon name="chevron-down" size={18} />
                            </div>
                            <ul className="ws-navlist">
                                {folders.map(([icon, name, count]) => (
                                    <li key={name}>
                                        <a href="#mail" aria-current={name === 'Inbox' ? 'page' : undefined}>
                                            <Icon name={icon as 'inbox'} />{name}{count ? <span className="ws-navlist__count">{count}</span> : null}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <hr className="ws-divider" />
                            <ul className="ws-navlist" aria-label="Folders">
                                <li>
                                    <a href="#mail"><Icon name="folder" />Partners<span className="ws-navlist__count">3</span></a>
                                    <ul className="ws-navlist ws-navlist--nested">
                                        <li><a href="#mail"><Icon name="folder" size={18} />Demo requests</a></li>
                                    </ul>
                                </li>
                                <li>
                                    <a href="#mail"><Icon name="folder" />Finance</a>
                                    <ul className="ws-navlist ws-navlist--nested">
                                        <li><a href="#mail"><Icon name="folder" size={18} />Invoices</a></li>
                                    </ul>
                                </li>
                                <li><a href="#mail"><Icon name="folder" />Projects</a></li>
                                <li><a href="#mail"><Icon name="plus" />New folder</a></li>
                            </ul>
                        </div>
                    ),
                },
                {
                    label: 'Messages',
                    content: (
                        <>
                            <div className="ws-listhead">
                                <h1>Inbox</h1>
                                <FilterChips label="Show" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'files', label: 'Attachments' }]} />
                            </div>
                            {MAIL.map((m, i) => <MailRow key={m.subject} {...m} selected={i === opened} onOpen={() => { location.hash = `mail/${String(i)}`; }} />)}
                        </>
                    ),
                },
                {
                    label: 'Message',
                    content: message === null ? <EmptyState title="No message open" hint="Choose a message in the list to read it." /> : (
                        <article className="ws-reader">
                            <div className="ws-toolbar" role="toolbar" aria-label="Message actions">
                                <button type="button" className="cms-icon-button" aria-label="Archive"><Icon name="archive" /></button>
                                <button type="button" className="cms-icon-button" aria-label="Delete"><Icon name="trash" /></button>
                                <button type="button" className="cms-icon-button" aria-label="Mark as unread"><Icon name="mail" /></button>
                                <button type="button" className="cms-icon-button" aria-label="Move to folder"><Icon name="folder" /></button>
                                <span className="ws-toolbar__count">1 of 248</span>
                                <button type="button" className="cms-icon-button" aria-label="More actions"><Icon name="more" /></button>
                            </div>
                            <div className="ws-message">
                                <h1>{message.subject}</h1>
                                <div className="ws-sender">
                                    <Avatar name={message.from} size={48} />
                                    <div className="ws-sender__who"><strong>{message.from}</strong> <span className="ws-sender__to">&lt;anna@example.com&gt;</span><br /><span className="ws-sender__to">to me, Tomasz Wójcik</span></div>
                                    <span className="ws-sender__time">Today, {message.time}</span>
                                    <button type="button" className="ws-square" aria-label="Reply"><Icon name="reply" /></button>
                                </div>
                                <p className="ws-body">Hi Ada,<br /><br />Can we walk through the Workspace and installing a module from the admin on Thursday? I have put a draft agenda below. Tomasz will join for the second half.<br /><br />Draft agenda:</p>
                                <ol className="ws-body"><li>Workspace: mail, chat and calls</li><li>Installing a module from the admin</li><li>Questions and next steps</li></ol>
                                <p className="ws-body">Thanks,<br />Anna</p>
                                <a className="ws-file" href="#mail"><span className="ws-file__type">PDF</span><span><strong>demo-agenda.pdf</strong><br /><span className="ws-file__meta">PDF document</span></span></a>
                                <div className="ws-reply">
                                    <Composer variant="reply" label={`Quick reply to ${message.from}`} placeholder="Write a reply" value={reply} onChange={setReply} onSend={() => setReply('')} onAttach={() => undefined} />
                                </div>
                            </div>
                        </article>
                    ),
                },
            ]} />
        </Shell>
    );
}

const CHATS = [
    { name: 'Anna Kowalska', last: 'See you on Thursday then.', time: '10:05', unread: 2, online: true },
    { name: 'Product team', last: 'Olga: the call panel is ready for review', time: '09:58', unread: 1 },
    { name: 'Tomasz Wójcik', last: 'Sent the lease, see clause 7', time: '08:20', online: true },
    { name: 'Partners', last: 'Marek: the agenda works for me', time: 'Yesterday' },
    { name: 'Pavel Sidorov', last: 'Thanks!', time: 'Yesterday' },
    { name: 'Olga Lis', last: 'I will share the mockups tonight', time: 'Mon' },
];

/** Chat's place, from the address: the conversations (`#chat`) or one of them (`#chat/<n>`). */
function ChatPage({ sub }: { readonly sub: string }): ReactNode {
    const [filter, setFilter] = useState('all');
    const [text, setText] = useState('');
    const opened = /^\d+$/.test(sub) && Number(sub) < CHATS.length ? Number(sub) : null;
    return (
        <Shell active="chat">
            <SplitPanes active={opened === null ? 0 : 1} {...(opened === null ? {} : { back: { label: 'Chats', href: '#chat' } })} panes={[
                {
                    label: 'Conversations',
                    content: (
                        <>
                            <div className="ws-listhead">
                                <h1>Chat</h1>
                                <button type="button" className="cms-button cms-button--chrome" aria-label="New conversation"><Icon name="plus" /></button>
                            </div>
                            <div style={{ padding: '0 var(--cms-space-5) var(--cms-space-3)' }}>
                                <FilterChips label="Show" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'direct', label: 'Direct' }, { id: 'groups', label: 'Groups' }]} />
                            </div>
                            <div className="ws-chatlist">
                                {CHATS.map((c, i) => (
                                    <button key={c.name} type="button" className="ws-chatrow" aria-current={i === opened ? 'true' : undefined} onClick={() => { location.hash = `chat/${String(i)}`; }}>
                                        <Avatar name={c.name} size={44} presence={c.online ? 'online' : undefined} />
                                        <span className="ws-chatrow__body">
                                            <span className="ws-chatrow__line"><span className="ws-chatrow__name">{c.name}</span><span className="ws-chatrow__time">{c.time}</span></span>
                                            <span className="ws-chatrow__line"><span className="ws-chatrow__last">{c.last}</span>{c.unread ? <Badge count={c.unread} label={`${c.unread} unread`} /> : null}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ),
                },
                {
                    label: 'Conversation',
                    content: opened === null ? <EmptyState title="No conversation open" hint="Choose a conversation to read and reply." /> : (
                        <div className="ws-convo">
                            <div className="ws-convo__head">
                                <Avatar name={CHATS[opened]!.name} size={44} presence={CHATS[opened]!.online ? 'online' : undefined} />
                                <div className="ws-convo__who"><strong>{CHATS[opened]!.name}</strong><br />{CHATS[opened]!.online ? <span className="ws-online">Online</span> : null}</div>
                                <button type="button" className="cms-button cms-button--chrome"><Icon name="phone" size={18} />Call</button>
                                <button type="button" className="ws-square" aria-label="Video call"><Icon name="video" /></button>
                                <button type="button" className="ws-square" aria-label="About this conversation"><Icon name="info" /></button>
                            </div>
                            <div className="ws-convo__messages" role="log" aria-label="Messages">
                                <span className="ws-day">Today</span>
                                <ChatBubble direction="in" time="09:51">Morning! Did you get my email about Thursday?</ChatBubble>
                                <ChatBubble direction="out" time="09:53" read>Yes, the agenda looks good. Let&apos;s add ten minutes for the mobile app.</ChatBubble>
                                <ChatBubble direction="in" time="09:55">Great. Can you also show a call between the browser and a phone?</ChatBubble>
                                <ChatBubble direction="out" time="09:57" read>Sure, that works on the demo now.</ChatBubble>
                                <ChatBubble direction="in" time="10:05">See you on Thursday then.</ChatBubble>
                            </div>
                            <Composer label={`Message ${CHATS[opened]!.name}`} placeholder={`Message ${CHATS[opened]!.name}`} value={text} onChange={setText} onSend={() => setText('')} onAttach={() => undefined} />
                        </div>
                    ),
                },
            ]} />
        </Shell>
    );
}

function CallsPage(): ReactNode {
    const [muted, setMuted] = useState(false);
    const [speaker, setSpeaker] = useState(true);
    return (
        <div className="ws-calls">
            <section aria-labelledby="incoming"><h2 id="incoming">Incoming</h2>
                <IncomingCall name="Anna Kowalska" media="audio" onAccept={() => undefined} onDecline={() => undefined} />
            </section>
            <section aria-labelledby="progress"><h2 id="progress">In progress</h2>
                <CallPanel name="Anna Kowalska" duration="04:12" connection="good" you={{ name: 'Ada Lovelace', speaking: true }} muted={muted} speaker={speaker}
                    onToggleMute={() => setMuted(m => !m)} onToggleSpeaker={() => setSpeaker(s => !s)} onAddPerson={() => undefined} onChat={() => undefined} onHangUp={() => undefined} />
            </section>
            <section className="ws-calls__bar" aria-labelledby="bar"><h2 id="bar">While you work in another section</h2>
                <CallBar name="Anna Kowalska" duration="04:12" muted={muted} onToggleMute={() => setMuted(m => !m)} onReturn={() => undefined} onHangUp={() => undefined} />
            </section>
        </div>
    );
}

function SignInPage(): ReactNode {
    return (
        <SignInLayout mark="C" product="CoolMS" headline="One sign-in for Admin and Workspace" lead="Mail, chat, calls and documents in one place, on the web and on your phone."
            features={[{ icon: 'mail', label: 'Mail' }, { icon: 'chat', label: 'Chat' }, { icon: 'phone', label: 'Calls' }, { icon: 'file', label: 'Documents' }]}>
            <SignInForm server="demo.coolms.com" onSubmit={() => undefined} forgotHref="#signin" createHref="#signin" />
        </SignInLayout>
    );
}

/** The page and the place within it, from the address: `#mail/2` is Mail with its third message open. */
function routeOf(hash: string): { readonly page: Page; readonly sub: string } {
    const [h = '', sub = ''] = hash.replace('#', '').split('/');
    return { page: h === 'chat' || h === 'calls' || h === 'signin' ? h : 'mail', sub };
}

function Demo(): ReactNode {
    const [route, setRoute] = useState(routeOf(location.hash));
    const [dark, setDark] = useState(new URLSearchParams(location.search).get('theme') === 'dark');
    useEffect(() => {
        const on = () => setRoute(routeOf(location.hash));
        addEventListener('hashchange', on);
        return () => removeEventListener('hashchange', on);
    }, []);
    useEffect(() => {
        if (dark) document.documentElement.dataset['theme'] = 'dark';
        else delete document.documentElement.dataset['theme'];
    }, [dark]);
    return (
        <>
            {route.page === 'mail' ? <MailPage sub={route.sub} /> : route.page === 'chat' ? <ChatPage sub={route.sub} /> : route.page === 'calls' ? <CallsPage /> : <SignInPage />}
            <button type="button" className="cms-button ws-theme" aria-pressed={dark} onClick={() => setDark(d => !d)}>Dark</button>
        </>
    );
}

/**
 * The layout probe (tools/check-layout.mjs): with `?probe=layout`, once the page and its fonts are drawn, it writes
 * what overflows the viewport, what scrolls sideways, and, below the desktop width, every control smaller than the
 * touch target, as JSON in `#layout-probe` for the headless browser to read. Framed at an exact width by the check's
 * harness, it writes the answer into the page that frames it, which is the page the browser dumps.
 */
function probeLayout(): void {
    const width = window.innerWidth;
    const touch = width < 1200;
    const min = 44;
    const name = (el: Element) => {
        const id = el.id ? `#${el.id}` : '';
        const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
        const label = el.getAttribute('aria-label') ?? (el.textContent ?? '').trim().slice(0, 40);
        return `${el.tagName.toLowerCase()}${id}${cls}${label ? ` "${label}"` : ''}`;
    };
    const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const overflow: string[] = [];
    const scrolls: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
        if (el.id === 'layout-probe' || !visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.right > width + 0.5 || r.left < -0.5) overflow.push(`${name(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
        const style = getComputedStyle(el);
        if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) scrolls.push(name(el));
    }
    const small: string[] = [];
    if (touch) {
        const controls = document.body.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="radio"], [role="tab"]');
        for (const el of Array.from(controls)) {
            if (!visible(el) || el.closest('.ws-theme')) continue;
            const r = el.getBoundingClientRect();
            if (r.width < min - 0.5 || r.height < min - 0.5) small.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
    }
    const host = window.top !== null && window.top !== window ? window.top.document : document;
    const out = host.createElement('pre');
    out.id = 'layout-probe';
    out.textContent = JSON.stringify({ width, scrollWidth: document.documentElement.scrollWidth, overflow, scrolls, small });
    host.body.appendChild(out);
}

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);

if (new URLSearchParams(location.search).get('probe') === 'layout') {
    // A timer, not an animation frame: a headless browser's virtual time runs timers, and the fonts are in by then.
    void document.fonts.ready.then(() => setTimeout(probeLayout, 500));
}

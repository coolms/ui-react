import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/tokens/coolms-tokens.css';
import '../src/kit.css';
import './demo.css';
import {
    Avatar,
    Button,
    ConfirmDialog,
    ContextMenu,
    EmptyState,
    ErrorBanner,
    List,
    Loading,
    Modal,
    PageHeader,
    Select,
    TabStrip,
    TextField,
    Toast,
    Toggle,
    offerFor,
    type MenuItem,
} from '../src';

/** One component's states, each under its contract name. */
function Section({ name, children }: { name: string; children: ReactNode }): ReactNode {
    return (
        <section className="demo-section" id={name}>
            <h2>{name}</h2>
            <div className="demo-states">{children}</div>
        </section>
    );
}

function State({ name, children }: { name: string; children: ReactNode }): ReactNode {
    return (
        <figure className="demo-state">
            <figcaption>{name}</figcaption>
            {children}
        </figure>
    );
}

const options = [{ value: 'inbox', label: 'Inbox' }, { value: 'archive', label: 'Archive' }];
const rows = [
    { id: '1', primary: 'Quarterly report', secondary: 'Ada Lovelace', lead: <Avatar name="Ada Lovelace" size={28} />, meta: '09:41' },
    { id: '2', primary: 'Invoice 2026-114', secondary: 'Billing', lead: <Avatar name="Billing" size={28} />, meta: 'Mon' },
    { id: '3', primary: 'Welcome', secondary: 'Bo Ek', lead: <Avatar name="Bo Ek" size={28} presence="online" />, meta: '12 Oct' },
];
const noop = () => undefined;

function Demo(): ReactNode {
    const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
    const [text, setText] = useState('Quarterly report');
    const [on, setOn] = useState(true);
    const [tab, setTab] = useState('all');
    const [modal, setModal] = useState<null | 'open' | 'dirty'>(null);
    const [confirm, setConfirm] = useState<null | 'default' | 'danger' | 'discard-changes'>(null);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const [selected, setSelected] = useState<string | null>('2');

    document.documentElement.dataset.theme = dark ? 'dark' : 'light';

    const menu: MenuItem[] = [
        { id: 'open', label: 'Open', offer: offerFor('allowed', { elevates: false }), onSelect: noop },
        { id: 'share', label: 'Share (item-locked: a client that elevates)', offer: offerFor('elevate', { elevates: true }), onSelect: noop },
        { id: 'move', label: 'Move', offer: offerFor('denied', { elevates: false, showRefused: true, refusal: 'The space is read-only' }), onSelect: noop },
        { id: 'purge', label: 'Purge (withheld: never drawn)', offer: offerFor('elevate', { elevates: false }), onSelect: noop },
        { id: 'delete', label: 'Delete', danger: true, offer: offerFor('allowed', { elevates: false }), onSelect: noop },
    ];

    return (
        <main className="demo">
            <PageHeader
                title="CoolMS UI kit for React"
                scope="Every component of the CoolMS UI contract, in every state it must render"
                actions={<Toggle label="Dark" checked={dark} onChange={setDark} />}
            />

            <Section name="button">
                <State name="default"><Button>Cancel</Button></State>
                <State name="primary"><Button variant="primary">Save</Button></State>
                <State name="danger"><Button variant="danger">Delete</Button></State>
                <State name="disabled"><Button disabled>Save</Button></State>
                <State name="busy"><Button variant="primary" busy busyLabel="Saving">Save</Button></State>
                <State name="locked"><Button locked lockedReason="needs an elevated session">Share</Button></State>
            </Section>

            <Section name="text-field">
                <State name="default"><TextField label="Subject" value={text} onChange={setText} help="Shown in the list" /></State>
                <State name="focused"><TextField label="Search" value="" placeholder="Click to focus" type="search" /></State>
                <State name="disabled"><TextField label="Subject" value="Draft" disabled /></State>
                <State name="read-only"><TextField label="Id" value="7f3c-91aa" readOnly /></State>
                <State name="invalid"><TextField label="Email" value="ada@" error="That is not an address yet" /></State>
                <State name="pinned"><TextField label="Mail host" value="mail.example.test" pinned="Set by MAIL_HOST in the environment" /></State>
            </Section>

            <Section name="select">
                <State name="default"><Select label="Folder" value="inbox" options={options} /></State>
                <State name="disabled"><Select label="Folder" value="inbox" options={options} disabled /></State>
                <State name="read-only"><Select label="Folder" value="archive" options={options} readOnly /></State>
                <State name="invalid"><Select label="Folder" value="inbox" options={options} error="Choose a folder you can write to" /></State>
                <State name="empty-list"><Select label="Folder" value="" options={[]} emptyText="No folders yet: create one first." /></State>
            </Section>

            <Section name="toggle">
                <State name="on / off"><Toggle label="Notify me" checked={on} onChange={setOn} /></State>
                <State name="disabled"><Toggle label="Notify me" checked={false} disabled /></State>
                <State name="read-only"><Toggle label="Notify me" checked readOnly help="Your administrator set this" /></State>
            </Section>

            <Section name="modal">
                <State name="open / closing"><Button onClick={() => setModal('open')}>Open a dialog</Button></State>
                <State name="dirty"><Button onClick={() => setModal('dirty')}>Open one with unsaved work</Button></State>
                <Modal
                    open={modal !== null}
                    title={modal === 'dirty' ? 'Edit signature' : 'Rename'}
                    dirty={modal === 'dirty'}
                    onClose={() => setModal(null)}
                    onDirtyClose={() => setConfirm('discard-changes')}
                    footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" onClick={() => setModal(null)}>Save</Button></>}
                >
                    <TextField label="Name" value={text} onChange={setText} />
                </Modal>
            </Section>

            <Section name="confirm-dialog">
                <State name="default"><Button onClick={() => setConfirm('default')}>Ask</Button></State>
                <State name="danger"><Button onClick={() => setConfirm('danger')}>Ask (danger)</Button></State>
                <State name="discard-changes"><Button onClick={() => setConfirm('discard-changes')}>Ask (discard)</Button></State>
                <ConfirmDialog
                    open={confirm !== null}
                    kind={confirm ?? 'default'}
                    title={confirm === 'danger' ? 'Delete 3 messages?' : confirm === 'discard-changes' ? 'Leave without saving?' : 'Send now?'}
                    message={confirm === 'danger' ? 'They cannot be recovered.' : confirm === 'discard-changes' ? 'Your changes to the signature are lost.' : 'It goes to 12 people.'}
                    confirmLabel={confirm === 'danger' ? 'Delete 3 messages' : confirm === 'default' ? 'Send' : undefined}
                    onConfirm={() => {
                        if (confirm === 'discard-changes') setModal(null);
                        setConfirm(null);
                    }}
                    onCancel={() => setConfirm(null)}
                />
            </Section>

            <Section name="toast">
                <State name="success"><Toast kind="success" message="Message sent" onDismiss={noop} /></State>
                <State name="error"><Toast kind="error" message="Not sent: the server did not answer" /></State>
                <State name="info"><Toast kind="info" message="Syncing 2 mailboxes" /></State>
                <State name="with-action"><Toast kind="success" message="3 messages archived" action={{ label: 'Undo', onAction: noop }} /></State>
            </Section>

            <Section name="loading">
                <State name="inline"><Loading what="Loading messages" /></State>
                <State name="block"><Loading what="Loading folders" layout="block" /></State>
            </Section>

            <Section name="empty-state">
                <State name="default"><EmptyState title="No messages" hint="Messages you receive appear here." /></State>
                <State name="with-action"><EmptyState title="No mailboxes" hint="Add one to start reading mail." action={<Button variant="primary">Add a mailbox</Button>} /></State>
            </Section>

            <Section name="error-banner">
                <State name="default"><ErrorBanner message="You cannot read this folder." /></State>
                <State name="with-retry"><ErrorBanner message="The server did not answer." onRetry={noop} /></State>
            </Section>

            <Section name="page-header">
                <State name="default"><PageHeader title="Inbox" /></State>
                <State name="with-actions"><PageHeader title="Inbox" scope="Work mail" actions={<Button variant="primary">Compose</Button>} /></State>
                <State name="with-back-link"><PageHeader title="Quarterly report" backLink={{ label: 'Inbox', onBack: noop }} /></State>
            </Section>

            <Section name="tab-strip">
                <State name="default / active / with-count">
                    <TabStrip
                        label="Views"
                        active={tab}
                        onSelect={setTab}
                        tabs={[{ id: 'all', label: 'All', count: 128 }, { id: 'unread', label: 'Unread', count: 3 }, { id: 'starred', label: 'Starred' }]}
                    />
                </State>
            </Section>

            <Section name="list">
                <State name="loading"><List label="Messages" rows={null} loadingText="Loading messages" /></State>
                <State name="empty"><List label="Messages" rows={[]} emptyTitle="No messages" emptyHint="Messages you receive appear here." /></State>
                <State name="populated / selected (right-click a row)">
                    <List label="Messages" rows={rows} selected={selected} onOpen={setSelected} onRowMenu={(id, at) => {
                        setSelected(id);
                        setMenuAt(at);
                    }} />
                </State>
                <State name="error"><List label="Messages" rows={null} error="The server did not answer." onRetry={noop} /></State>
            </Section>

            <Section name="avatar">
                <State name="picture"><Avatar name="Ada Lovelace" size={40} pictureUrl="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%2390a4c8'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%23e8edf5'/%3E%3Crect x='8' y='26' width='24' height='14' rx='7' fill='%23e8edf5'/%3E%3C/svg%3E" /></State>
                <State name="initials"><Avatar name="Ada Lovelace" size={40} /></State>
                <State name="presence"><Avatar name="Bo Ek" size={40} presence="online" /> <Avatar name="Cy Lu" size={40} presence="away" /> <Avatar name="Di Mo" size={40} presence="offline" /></State>
            </Section>

            <Section name="context-menu">
                <State name="open / item-danger / item-locked / item-refused">
                    <Button onClick={e => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenuAt({ x: r.left, y: r.bottom + 4 });
                    }}>Open the menu</Button>
                </State>
                <ContextMenu at={menuAt} items={menu} onClose={() => setMenuAt(null)} />
            </Section>

            <Section name="elevation-required">
                <State name="not offered">
                    <p className="demo-note">This kit's clients never elevate: an action the server answers <code>elevate</code> is not offered at all.</p>
                </State>
            </Section>
        </main>
    );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);

import type { ReactNode } from 'react';

/** The icons the Workspace draws: one stroke style, 24 units, coloured by the text around them. */
export type IconName =
    | 'mail' | 'chat' | 'phone' | 'calendar' | 'file' | 'image' | 'search' | 'bell' | 'pencil' | 'star' | 'send'
    | 'inbox' | 'archive' | 'trash' | 'paperclip' | 'mic' | 'speaker' | 'user-plus' | 'phone-off' | 'video' | 'info'
    | 'chevron-down' | 'chevron-left' | 'plus' | 'folder' | 'check' | 'server' | 'reply' | 'more'
    | 'download' | 'print' | 'open-separately' | 'important' | 'forward' | 'refresh' | 'file-code' | 'mail-open' | 'copy' | 'user'
    | 'folder-plus' | 'folder-x' | 'user-check' | 'user-x' | 'upload' | 'users';

const PATHS: Readonly<Record<IconName, ReactNode>> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    // The envelope with its flap open above it: a message read, or the message itself again.
    'mail-open': <><path d="M3 10v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9" /><path d="m3 10 9-6 9 6" /><path d="m3 10 9 6 9-6" /></>,
    // A clipboard: copy what is shown.
    copy: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
    chat: <path d="M4 12a8 8 0 1 1 4 6.9L4 20l1.1-4A8 8 0 0 1 4 12Z" />,
    phone: <path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></>,
    // The file, with code's angle brackets in place of its lines: a message's source.
    'file-code': <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6" /><path d="m10 12-2 2.5 2 2.5M14 12l2 2.5-2 2.5" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 17-5-5-9 8" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2 8 2 8H4s2-2 2-8Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    pencil: <><path d="M4 20h4L19 9l-4-4L4 16Z" /><path d="m13 7 4 4" /></>,
    download: <><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
    // Download's arrow turned up, from the line: a file sent up.
    upload: <><path d="M12 20V9" /><path d="m7 13 5-5 5 5" /><path d="M4 4h16" /></>,
    print: <><path d="M7 8V4h10v4" /><rect x="3" y="8" width="18" height="8" rx="2" /><path d="M7 14h10v6H7Z" /></>,
    'open-separately': <><path d="M14 4h6v6" /><path d="m20 4-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
    star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9Z" />,
    send: <><path d="M21 3 10 14" /><path d="M21 3 14 21l-4-7-7-4Z" /></>,
    inbox: <><path d="M3 13h5l1 3h6l1-3h5" /><path d="M5 5h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z" /></>,
    archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13a2 2 0 0 0 2 1h6a2 2 0 0 0 2-1l1-13M9 7V4h6v3" /></>,
    paperclip: <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    speaker: <><path d="M4 9h4l5-4v14l-5-4H4Z" /><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></>,
    'user-plus': <><circle cx="10" cy="8" r="4" /><path d="M3 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></>,
    // A person, nothing more: one whose account is gone.
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    // A person with a tick: someone allowed.
    'user-check': <><circle cx="10" cy="8" r="4" /><path d="M3 21a7 7 0 0 1 14 0M16 11l2 2 4-4" /></>,
    // A person with a cross: someone no longer allowed.
    'user-x': <><circle cx="10" cy="8" r="4" /><path d="M3 21a7 7 0 0 1 14 0M17 8l4 4M21 8l-4 4" /></>,
    // Two people: the members of a group.
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
    'phone-off': <path d="M3 14c5-5 13-5 18 0l-2 3-4-1v-3a10 10 0 0 0-6 0v3l-4 1Z" />,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'chevron-left': <path d="m15 18-6-6 6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
    // The folder with a plus inside: a new folder.
    'folder-plus': <><path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M12 10.5v6M9 13.5h6" /></>,
    // The folder with a cross inside: a folder removed.
    'folder-x': <><path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="m9.5 11 5 5M14.5 11l-5 5" /></>,
    check: <path d="m5 12 5 5 9-10" />,
    server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.5M7 16.5h.5" /></>,
    reply: <path d="M10 8 4 13l6 5M4 13h11a5 5 0 0 1 5 5" />,
    // Reply's mirror: the arrow leaves to the right.
    forward: <path d="m14 8 6 5-6 5M20 13H9a5 5 0 0 0-5 5" />,
    refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
    more: <path d="M5 12h.5M12 12h.5M19 12h.5" />,
    important: <path d="M4 6h11l5 6-5 6H4l4-6-4-6Z" />,
};

export interface IconProps {
    readonly name: IconName;
    readonly size?: number;
    /** Only for an icon that stands alone and carries meaning; an icon beside its text is decorative. */
    readonly label?: string;
}

/** An icon from the Workspace's set; decorative unless given a label. */
export function Icon({ name, size = 20, label }: IconProps): ReactNode {
    return (
        <svg
            className="cms-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={name === 'more' ? 3 : 1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable={false}
            {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
        >
            {PATHS[name]}
        </svg>
    );
}

export const ICON_NAMES = Object.keys(PATHS) as readonly IconName[];

/**
 * The server's action icons, named as Bootstrap Icons names them, to the kit's own: the one table that turns a node's
 * icon into what the kit draws. A name not here has no icon: a toolbar shows its action's label alone, and NamedIcon
 * keeps the icon's space empty.
 */
export const BOOTSTRAP_ICONS: Readonly<Record<string, IconName>> = {
    reply: 'reply',
    'reply-all': 'reply',
    forward: 'forward',
    envelope: 'mail',
    'envelope-open': 'mail-open',
    star: 'star',
    'star-fill': 'star',
    'folder-symlink': 'folder',
    folder: 'folder',
    trash: 'trash',
    archive: 'archive',
    'arrow-clockwise': 'refresh',
    download: 'download',
    printer: 'print',
    'file-earmark-code': 'file-code',
    clipboard: 'copy',
    'three-dots': 'more',
    pencil: 'pencil',
    trash3: 'trash',
    'folder-plus': 'folder-plus',
    'folder-x': 'folder-x',
    image: 'image',
    'person-check': 'user-check',
    'person-x': 'user-x',
    'arrow-left': 'chevron-left',
    'pencil-square': 'pencil',
    'cloud-upload': 'upload',
    people: 'users',
    'file-earmark-word': 'file',
    'file-earmark-spreadsheet': 'file',
    'file-earmark-text': 'file',
    folder2: 'folder',
    'folder2-open': 'folder',
    'chat-dots': 'chat',
    images: 'image',
    paperclip: 'paperclip',
};

/** The kit's icon for a server's (Bootstrap Icons) name; null for a name the table does not hold. */
export function iconForName(name: string): IconName | null {
    return Object.prototype.hasOwnProperty.call(BOOTSTRAP_ICONS, name) ? BOOTSTRAP_ICONS[name]! : null;
}

declare const process: { readonly env: { readonly NODE_ENV?: string } };

/**
 * Whether the host runs outside production, as its bundler states `process.env.NODE_ENV`. A host with no `process` at
 * all, which no bundler replaced, counts as production: the read never throws into a render.
 */
function outsideProduction(): boolean {
    try {
        return process.env.NODE_ENV !== 'production';
    } catch {
        return false;
    }
}

const warned = new Set<string>();

/**
 * A server's icon, by its (Bootstrap Icons) name, at the size a row of items draws them. A name the kit's table does not
 * hold draws an empty space of the same size, so the labels beside it line up, and outside production says so once per
 * name in the console. No name draws nothing.
 */
export function NamedIcon({ name, size = 18 }: { readonly name: string; readonly size?: number }): ReactNode {
    if (name === '') return null;
    const icon = iconForName(name);
    if (icon !== null) return <Icon name={icon} size={size} />;
    if (!warned.has(name) && outsideProduction()) {
        warned.add(name);
        console.warn(`@coolms/ui-react: no icon for the server's icon name "${name}"; its space is kept empty`);
    }
    return <span className="cms-icon cms-icon--blank" style={{ width: size, height: size }} aria-hidden="true" data-icon-name={name} />;
}

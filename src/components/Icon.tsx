import type { ReactNode } from 'react';

/** The icons the Workspace draws: one stroke style, 24 units, coloured by the text around them. */
export type IconName =
    | 'mail' | 'chat' | 'phone' | 'calendar' | 'file' | 'image' | 'search' | 'bell' | 'pencil' | 'star' | 'send'
    | 'inbox' | 'archive' | 'trash' | 'paperclip' | 'mic' | 'speaker' | 'user-plus' | 'phone-off' | 'video' | 'info'
    | 'chevron-down' | 'chevron-left' | 'plus' | 'folder' | 'check' | 'server' | 'reply' | 'more';

const PATHS: Readonly<Record<IconName, ReactNode>> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    chat: <path d="M4 12a8 8 0 1 1 4 6.9L4 20l1.1-4A8 8 0 0 1 4 12Z" />,
    phone: <path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 17-5-5-9 8" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2 8 2 8H4s2-2 2-8Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    pencil: <><path d="M4 20h4L19 9l-4-4L4 16Z" /><path d="m13 7 4 4" /></>,
    star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9Z" />,
    send: <><path d="M21 3 10 14" /><path d="M21 3 14 21l-4-7-7-4Z" /></>,
    inbox: <><path d="M3 13h5l1 3h6l1-3h5" /><path d="M5 5h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z" /></>,
    archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13a2 2 0 0 0 2 1h6a2 2 0 0 0 2-1l1-13M9 7V4h6v3" /></>,
    paperclip: <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    speaker: <><path d="M4 9h4l5-4v14l-5-4H4Z" /><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></>,
    'user-plus': <><circle cx="10" cy="8" r="4" /><path d="M3 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></>,
    'phone-off': <path d="M3 14c5-5 13-5 18 0l-2 3-4-1v-3a10 10 0 0 0-6 0v3l-4 1Z" />,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'chevron-left': <path d="m15 18-6-6 6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
    check: <path d="m5 12 5 5 9-10" />,
    server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.5M7 16.5h.5" /></>,
    reply: <path d="M10 8 4 13l6 5M4 13h11a5 5 0 0 1 5 5" />,
    more: <path d="M5 12h.5M12 12h.5M19 12h.5" />,
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

import type { ReactNode } from 'react';

/** Class names, the falsy ones left out. */
export function cx(...names: ReadonlyArray<string | false | null | undefined>): string {
    return names.filter(Boolean).join(' ');
}

/** The kit's few glyphs, inline: no icon font, no dependency. Decorative -- the text beside them carries the meaning. */
export function Glyph({ name }: { name: 'lock' | 'spinner' | 'back' | 'close' | 'warning' | 'check' | 'info' }): ReactNode {
    const common = { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true, focusable: false } as const;
    switch (name) {
        case 'lock':
            return (
                <svg {...common} className="cms-glyph">
                    <path fill="currentColor" d="M5 7V5a3 3 0 1 1 6 0v2h.5A1.5 1.5 0 0 1 13 8.5v5A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5v-5A1.5 1.5 0 0 1 4.5 7H5Zm1.5 0h3V5a1.5 1.5 0 0 0-3 0v2Z" />
                </svg>
            );
        case 'spinner':
            return (
                <svg {...common} className="cms-glyph cms-spinner">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                </svg>
            );
        case 'back':
            return (
                <svg {...common} className="cms-glyph">
                    <path fill="currentColor" d="M10.7 2.3a1 1 0 0 1 0 1.4L6.4 8l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
                </svg>
            );
        case 'close':
            return (
                <svg {...common} className="cms-glyph">
                    <path fill="currentColor" d="M3.3 3.3a1 1 0 0 1 1.4 0L8 6.6l3.3-3.3a1 1 0 1 1 1.4 1.4L9.4 8l3.3 3.3a1 1 0 0 1-1.4 1.4L8 9.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L6.6 8 3.3 4.7a1 1 0 0 1 0-1.4Z" />
                </svg>
            );
        case 'warning':
            return (
                <svg {...common} className="cms-glyph">
                    <path fill="currentColor" d="M8.9 1.5a1 1 0 0 0-1.8 0l-6 11A1 1 0 0 0 2 14h12a1 1 0 0 0 .9-1.5l-6-11ZM8 5a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V6a1 1 0 0 1 1-1Zm0 7.5A1 1 0 1 1 8 10.5a1 1 0 0 1 0 2Z" />
                </svg>
            );
        case 'check':
            return (
                <svg {...common} className="cms-glyph">
                    <path fill="currentColor" d="M13.7 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L7 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z" />
                </svg>
            );
        case 'info':
            return (
                <svg {...common} className="cms-glyph">
                    <path fill="currentColor" d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 5.5a1 1 0 0 0-1 1V11a1 1 0 1 0 2 0V7.5a1 1 0 0 0-1-1ZM8 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
                </svg>
            );
    }
}

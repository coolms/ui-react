import type { HTMLAttributes, ReactNode, Ref, UIEventHandler } from 'react';
import { cx } from './internal.js';

export interface ColumnProps {
    /** What stays at the column's top and never scrolls: its section header, a pane toolbar, a list's head. */
    readonly head?: ReactNode;
    /** The column's list or content, in its one scroll region. */
    readonly children?: ReactNode;
    readonly className?: string;
    /** The scroll region itself, for a host that reads more as the person scrolls. */
    readonly scrollRef?: Ref<HTMLDivElement>;
    readonly onScroll?: UIEventHandler<HTMLDivElement>;
    /** Further attributes of the scroll region (a `data-list` name, an accessible name). */
    readonly bodyProps?: Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onScroll'> & { readonly [data: `data-${string}`]: string | undefined };
}

/**
 * A column of a fill layout (contract `split-panes`, grid: each pane has exactly one scroll region): a head that stays at
 * the top, and under it a body that scrolls on its own and fills the rest of the column's height. In a pane of
 * SplitPanes, in a screen shell or in any box of a definite height, the head and its primary action never scroll away.
 */
export function Column({ head, children, className, scrollRef, onScroll, bodyProps }: ColumnProps): ReactNode {
    return (
        <div className={cx('cms-column', className)}>
            {head === undefined || head === null ? null : <div className="cms-column__head">{head}</div>}
            <div {...bodyProps} className={cx('cms-column__body', bodyProps?.className)} ref={scrollRef} onScroll={onScroll}>
                {children}
            </div>
        </div>
    );
}

import type { ReactNode } from 'react';
import { FilterMenu, type ListFilter } from './FilterMenu.js';

export interface ListHeadProps {
    /** Before the name: the list's select-all box. */
    readonly leading?: ReactNode;
    /** The list's name: a folder's, or what the list holds. */
    readonly name: string;
    /** The list's filter, at the row's end. */
    readonly filter?: ListFilter;
}

/**
 * A list's second row (contract pane-toolbar, header row): the name on one line at the start, cut with an ellipsis, its
 * whole text as its title, and the list's filter at the end, whole at every width. The row's padding is the host's.
 */
export function ListHead({ leading, name, filter }: ListHeadProps): ReactNode {
    return (
        <div className="cms-list-head">
            {leading != null ? <span className="cms-list-head__leading">{leading}</span> : null}
            <h2 className="cms-list-head__name" title={name}>{name}</h2>
            {filter !== undefined ? <FilterMenu {...filter} /> : null}
        </div>
    );
}

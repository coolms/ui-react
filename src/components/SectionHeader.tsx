import { useId, useState, type ReactNode } from 'react';
import { ContextMenu, type MenuItem } from './Collections.js';
import { Icon, type IconName } from './Icon.js';
import type { Offer } from '../server/capability.js';

/** The section's primary action: one action, or a split button whose menu lists the action's declared entries. */
export type SectionPrimary =
    | { readonly label: string; readonly icon: IconName; readonly onPress: () => void; readonly offer?: Offer }
    | {
          readonly label: string;
          readonly icon: IconName;
          readonly onPress: () => void;
          readonly offer?: Offer;
          readonly menu: readonly MenuItem[];
          /** The split menu button's accessible name. */
          readonly menuLabel: string;
      };

export interface SectionHeaderProps {
    /** The section's declared title. */
    readonly title: string;
    /** An icon before the title. */
    readonly icon?: IconName;
    /** Given only when the section declares one. */
    readonly primary?: SectionPrimary;
    /** The section's other declared actions, in the tree's order; a refused one stays, with the server's reason. */
    readonly more?: readonly MenuItem[];
    /** More's accessible name and tooltip, from the host's catalogue. */
    readonly moreLabel: string;
    /** Row 2: the section's context (a mailbox card, filters, breadcrumbs); with none, no row 2. */
    readonly context?: ReactNode;
    /** The header spans a one-column page. */
    readonly fullWidth?: boolean;
}

/**
 * The head of a section from tablet width up (contract component `section-header`: default, with-primary,
 * with-primary-menu, with-more, action-disabled, with-context, full-width). Row 1: the title, then the primary action
 * (icon and label, always shown; a split button while it has an entry to show, a plain button with none) and More for
 * the other actions. Row 2: the context, only when given. No divider lines. Below tablet width the host draws the
 * screen shell instead.
 */
export function SectionHeader({ title, icon, primary, more = [], moreLabel, context, fullWidth = false }: SectionHeaderProps): ReactNode {
    const [menu, setMenu] = useState<{ which: 'primary' | 'more'; x: number; y: number } | null>(null);
    const reasonId = useId();
    const offered = more.filter(m => m.offer.offered);
    const refusal = primary?.offer?.refusal;
    const off = primary !== undefined && (primary.offer?.offered === false || refusal !== undefined);
    // The primary's menu entries that are shown: with none, the primary is a plain button with no menu half.
    const entries = primary !== undefined && 'menu' in primary ? primary.menu.filter(m => m.offer.offered) : [];
    const split = primary !== undefined && 'menu' in primary && entries.length > 0 ? primary : null;
    const toggle = (which: 'primary' | 'more', target: HTMLElement) => {
        const r = target.getBoundingClientRect();
        setMenu(menu?.which === which ? null : { which, x: r.left, y: r.bottom + 4 });
    };
    return (
        <header className={`cms-section-header${fullWidth ? ' cms-section-header--full' : ''}`}>
            <div className="cms-section-header__row" data-row="1">
                {icon !== undefined ? <Icon name={icon} /> : null}
                <h1 className="cms-section-header__title" title={title}>{title}</h1>
                <div className="cms-section-header__actions">
                    {primary !== undefined && primary.offer?.offered !== false ? (
                        <span className={`cms-section-header__primary${split !== null ? ' cms-section-header__primary--split' : ''}`}>
                            <button
                                type="button"
                                className="cms-button cms-button--primary"
                                data-action="primary"
                                aria-disabled={off ? 'true' : undefined}
                                aria-describedby={refusal !== undefined ? reasonId : undefined}
                                title={refusal}
                                onClick={() => {
                                    if (!off) primary.onPress();
                                }}
                            >
                                <Icon name={primary.icon} /> <span>{primary.label}</span>
                            </button>
                            {split !== null ? (
                                <button
                                    type="button"
                                    className="cms-button cms-button--primary cms-section-header__split"
                                    data-action="primary-menu"
                                    aria-haspopup="menu"
                                    aria-expanded={menu?.which === 'primary'}
                                    aria-label={split.menuLabel}
                                    onClick={e => toggle('primary', e.currentTarget)}
                                >
                                    <Icon name="chevron-down" />
                                </button>
                            ) : null}
                            {refusal !== undefined ? <span id={reasonId} className="cms-visually-hidden">{refusal}</span> : null}
                        </span>
                    ) : null}
                    {offered.length > 0 ? (
                        <button
                            type="button"
                            className="cms-section-header__more"
                            data-action="more"
                            aria-haspopup="menu"
                            aria-expanded={menu?.which === 'more'}
                            aria-label={moreLabel}
                            title={moreLabel}
                            onClick={e => toggle('more', e.currentTarget)}
                        >
                            <Icon name="more" />
                        </button>
                    ) : null}
                </div>
            </div>
            {context !== undefined && context !== null ? (
                <div className="cms-section-header__context" data-row="2">{context}</div>
            ) : null}
            {split !== null ? (
                <ContextMenu at={menu?.which === 'primary' ? menu : null} items={entries} onClose={() => setMenu(null)} label={split.menuLabel} />
            ) : null}
            <ContextMenu at={menu?.which === 'more' ? menu : null} items={more} onClose={() => setMenu(null)} label={moreLabel} />
        </header>
    );
}

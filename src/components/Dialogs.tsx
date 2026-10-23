import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cx, Glyph } from './internal';

/** How long the closing state is drawn before the dialog leaves the page. */
export const MODAL_CLOSE_MS = 150;

export interface ModalProps {
    readonly open: boolean;
    readonly title: ReactNode;
    /** Asked to close: Escape, the scrim, the close button. */
    readonly onClose: () => void;
    /**
     * It holds unsaved work: Escape and the scrim do not close it; they call onDirtyClose, which asks the person
     * (typically a discard-changes ConfirmDialog). The close button does the same.
     */
    readonly dirty?: boolean;
    readonly onDirtyClose?: () => void;
    readonly children: ReactNode;
    /** The dialog's actions, at its foot. */
    readonly footer?: ReactNode;
}

/**
 * A dialog over the page (contract component `modal`: open, closing, dirty). Focus moves into it on open and back to
 * where it was on close; Tab stays inside while it is open.
 */
export function Modal({ open, title, onClose, dirty = false, onDirtyClose, children, footer }: ModalProps): ReactNode {
    const [shown, setShown] = useState(open);
    const [closing, setClosing] = useState(false);
    const panel = useRef<HTMLDivElement>(null);
    const returnTo = useRef<Element | null>(null);
    const titleId = useId();

    useEffect(() => {
        if (open) {
            returnTo.current = document.activeElement;
            setShown(true);
            setClosing(false);
            return;
        }
        if (!shown) return;
        setClosing(true);
        const t = window.setTimeout(() => {
            setShown(false);
            setClosing(false);
            (returnTo.current as HTMLElement | null)?.focus?.();
        }, MODAL_CLOSE_MS);
        return () => window.clearTimeout(t);
    }, [open, shown]);

    useEffect(() => {
        if (open && shown) {
            // The body's first control, not the header's close button: opening a dialog is for what is in it.
            const focusable = 'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])';
            const first = panel.current?.querySelector<HTMLElement>(`.cms-modal__body :is(${focusable}), .cms-modal__foot :is(${focusable})`);
            (first ?? panel.current)?.focus();
        }
    }, [open, shown]);

    if (!shown) return null;

    const askToClose = () => {
        if (dirty) onDirtyClose?.();
        else onClose();
    };

    return createPortal(
        <div className={cx('cms-modal-scrim', closing && 'is-closing')} onMouseDown={e => {
            if (e.target === e.currentTarget) askToClose();
        }}>
            <div
                ref={panel}
                className={cx('cms-modal', closing && 'is-closing', dirty && 'is-dirty')}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onKeyDown={e => {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        askToClose();
                    } else if (e.key === 'Tab') {
                        const focusable = panel.current?.querySelectorAll<HTMLElement>('input, select, textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
                        if (!focusable || focusable.length === 0) return;
                        const first = focusable[0]!;
                        const last = focusable[focusable.length - 1]!;
                        if (e.shiftKey && document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        } else if (!e.shiftKey && document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }}
            >
                <header className="cms-modal__head">
                    <h2 className="cms-modal__title" id={titleId}>{title}</h2>
                    <button type="button" className="cms-icon-button" aria-label="Close" onClick={askToClose}>
                        <Glyph name="close" />
                    </button>
                </header>
                <div className="cms-modal__body">{children}</div>
                {footer != null ? <footer className="cms-modal__foot">{footer}</footer> : null}
            </div>
        </div>,
        document.body,
    );
}

export interface ConfirmDialogProps {
    readonly open: boolean;
    readonly title: ReactNode;
    readonly message?: ReactNode;
    /**
     * default: a question; danger: the action destroys or cannot be undone -- its button is the danger one;
     * discard-changes: leaving loses unsaved work -- "Discard changes" against "Keep editing".
     */
    readonly kind?: 'default' | 'danger' | 'discard-changes';
    /** The confirming button names the outcome ("Delete 3 messages"), never "OK". */
    readonly confirmLabel?: ReactNode;
    readonly cancelLabel?: ReactNode;
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
}

/** A question before a destructive or irreversible action (contract component `confirm-dialog`: default, danger, discard-changes). */
export function ConfirmDialog({ open, title, message, kind = 'default', confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps): ReactNode {
    const discard = kind === 'discard-changes';
    return (
        <Modal
            open={open}
            title={title}
            onClose={onCancel}
            footer={
                <>
                    <Button onClick={onCancel}>{cancelLabel ?? (discard ? 'Keep editing' : 'Cancel')}</Button>
                    <Button variant={kind === 'default' ? 'primary' : 'danger'} onClick={onConfirm}>
                        {confirmLabel ?? (discard ? 'Discard changes' : 'Confirm')}
                    </Button>
                </>
            }
        >
            {kind !== 'default' ? <p className="cms-confirm__warning"><Glyph name="warning" /> {message}</p> : <p>{message}</p>}
        </Modal>
    );
}

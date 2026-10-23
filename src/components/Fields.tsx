import { useId, type ReactNode } from 'react';
import { cx, Glyph } from './internal';

interface FieldFrame {
    readonly label: ReactNode;
    /** What the field is for, under it. */
    readonly help?: ReactNode;
    /** Why the value is not accepted; makes the field invalid. */
    readonly error?: ReactNode;
    readonly disabled?: boolean;
    /** Shown, focusable and copyable, but not changed here. */
    readonly readOnly?: boolean;
}

function Frame({ id, label, help, error, pinned, children }: {
    id: string;
    label: ReactNode;
    help: ReactNode;
    error: ReactNode;
    pinned?: ReactNode;
    children: ReactNode;
}): ReactNode {
    return (
        <div className={cx('cms-field', error != null && 'is-invalid')}>
            <label className="cms-field__label" htmlFor={id}>{label}</label>
            {children}
            {pinned != null ? (
                <p className="cms-field__pinned" id={`${id}-pinned`}><Glyph name="lock" /> {pinned}</p>
            ) : null}
            {error != null ? <p className="cms-field__error" id={`${id}-error`} role="alert">{error}</p> : null}
            {help != null ? <p className="cms-field__help" id={`${id}-help`}>{help}</p> : null}
        </div>
    );
}

function describedBy(id: string, parts: { help: unknown; error: unknown; pinned?: unknown }): string | undefined {
    const ids = [parts.error != null && `${id}-error`, parts.pinned != null && `${id}-pinned`, parts.help != null && `${id}-help`]
        .filter(Boolean)
        .join(' ');
    return ids === '' ? undefined : ids;
}

export interface TextFieldProps extends FieldFrame {
    readonly value: string;
    readonly onChange?: (value: string) => void;
    readonly placeholder?: string;
    readonly type?: 'text' | 'email' | 'url' | 'search' | 'tel' | 'password';
    /**
     * The value is set by the environment, not here (a pinned setting): shown read-only with why, the way the admin
     * shows a key the deployment pins.
     */
    readonly pinned?: ReactNode;
    readonly name?: string;
}

/** One line of text (contract component `text-field`: default, focused, disabled, read-only, invalid, pinned). */
export function TextField({ label, help, error, disabled, readOnly, pinned, value, onChange, placeholder, type = 'text', name }: TextFieldProps): ReactNode {
    const id = useId();
    return (
        <Frame id={id} label={label} help={help} error={error} pinned={pinned}>
            <input
                id={id}
                name={name}
                type={type}
                className="cms-input"
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly || pinned != null}
                aria-invalid={error != null || undefined}
                aria-describedby={describedBy(id, { help, error, pinned })}
                onChange={e => onChange?.(e.target.value)}
            />
        </Frame>
    );
}

export interface SelectOption {
    readonly value: string;
    readonly label: string;
}

export interface SelectProps extends FieldFrame {
    readonly value: string;
    readonly options: readonly SelectOption[];
    readonly onChange?: (value: string) => void;
    /** What the field says when the list has nothing to choose from (contract state `empty-list`). */
    readonly emptyText?: ReactNode;
    readonly name?: string;
}

/** One choice from a list (contract component `select`: default, disabled, read-only, invalid, empty-list). */
export function Select({ label, help, error, disabled, readOnly, value, options, onChange, emptyText = 'Nothing to choose from yet.', name }: SelectProps): ReactNode {
    const id = useId();
    const empty = options.length === 0;
    return (
        <Frame id={id} label={label} help={empty ? emptyText : help} error={error}>
            <select
                id={id}
                name={name}
                className="cms-input cms-select"
                value={value}
                disabled={disabled || empty}
                aria-readonly={readOnly || undefined}
                aria-invalid={error != null || undefined}
                aria-describedby={describedBy(id, { help: empty ? emptyText : help, error })}
                onChange={e => {
                    if (!readOnly) onChange?.(e.target.value);
                }}
            >
                {options.map(o => (
                    <option key={o.value} value={o.value} disabled={readOnly && o.value !== value}>{o.label}</option>
                ))}
            </select>
        </Frame>
    );
}

export interface ToggleProps {
    readonly label: ReactNode;
    readonly checked: boolean;
    readonly onChange?: (checked: boolean) => void;
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
    readonly help?: ReactNode;
}

/** On or off, the label on the same baseline (contract component `toggle`: on, off, disabled, read-only). */
export function Toggle({ label, checked, onChange, disabled, readOnly, help }: ToggleProps): ReactNode {
    const id = useId();
    return (
        <div className="cms-toggle-row">
            <button
                id={id}
                type="button"
                role="switch"
                className={cx('cms-toggle', checked && 'is-on')}
                aria-checked={checked}
                aria-readonly={readOnly || undefined}
                aria-describedby={help != null ? `${id}-help` : undefined}
                disabled={disabled}
                onClick={() => {
                    if (!readOnly) onChange?.(!checked);
                }}
            >
                <span className="cms-toggle__thumb" />
            </button>
            <label className="cms-toggle__label" htmlFor={id}>{label}</label>
            {help != null ? <p className="cms-field__help" id={`${id}-help`}>{help}</p> : null}
        </div>
    );
}

import { useId, type ReactNode } from 'react';
import { cx, Glyph } from './internal.js';

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

/** The native kinds of one line: each brings the device's own keyboard or picker and its accessibility. */
export type TextFieldType = 'text' | 'email' | 'url' | 'search' | 'tel' | 'password' | 'number' | 'date' | 'time' | 'datetime-local';

/** What the server declares about a value: its bounds, its step and its length. */
interface Constraints {
    /** The least value: a number, or an ISO date or time for the date and time types. */
    readonly min?: string | number;
    /** The greatest value, as `min`. */
    readonly max?: string | number;
    /** The step between values (`any` for none): seconds for `time` and `datetime-local`, days for `date`. */
    readonly step?: number | 'any';
    readonly minLength?: number;
    readonly maxLength?: number;
    /** A value is needed: marked for assistive technology, and checked by the browser on submit. */
    readonly required?: boolean;
}

export interface TextFieldProps extends FieldFrame, Constraints {
    /** The value as the input holds it: digits for `number`, ISO for the date and time types (`2026-11-18`, `14:30`, `2026-11-18T14:30`). */
    readonly value: string;
    readonly onChange?: (value: string) => void;
    readonly placeholder?: string;
    readonly type?: TextFieldType;
    /**
     * The person's locale (BCP 47, from their settings): the field's language, and how a read-only or pinned date or
     * time is written out. An editable date or time is the device's own picker.
     */
    readonly locale?: string;
    /**
     * The value is set by the environment, not here (a pinned setting): shown read-only with why, the way the admin
     * shows a key the deployment pins.
     */
    readonly pinned?: ReactNode;
    readonly name?: string;
}

const WHEN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const CLOCK = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * A date or time value written out in a locale, as the wall-clock value it is (no time zone is applied); the value
 * itself when it is not one the type holds, or names no real date or time (a 30 February, a 25th hour).
 */
export function writtenOut(type: TextFieldType, value: string, locale: string | undefined): string {
    // The moment the parts name, or null when they name none (a 30 February, a 25th hour): never rolled over.
    const at = (y: number, mo: number, d: number, h = 0, mi = 0, se = 0): Date | null => {
        const moment = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
        moment.setUTCFullYear(y);
        const same = moment.getUTCFullYear() === y && moment.getUTCMonth() === mo - 1 && moment.getUTCDate() === d
            && moment.getUTCHours() === h && moment.getUTCMinutes() === mi && moment.getUTCSeconds() === se;
        return same ? moment : null;
    };
    const clock = (time: RegExpMatchArray) => ({ hour: Number(time[1]), minute: Number(time[2]), second: Number(time[3] ?? 0) });
    try {
        if (type === 'time') {
            const t = value.match(CLOCK);
            if (t === null) return value;
            const c = clock(t);
            const moment = at(2000, 1, 1, c.hour, c.minute, c.second);
            return moment === null ? value : new Intl.DateTimeFormat(locale, { timeStyle: t[3] === undefined ? 'short' : 'medium', timeZone: 'UTC' }).format(moment);
        }
        const w = value.match(WHEN);
        if (w === null) return value;
        if (type === 'date' && w[4] === undefined) {
            const moment = at(Number(w[1]), Number(w[2]), Number(w[3]));
            return moment === null ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(moment);
        }
        if (type === 'datetime-local' && w[4] !== undefined) {
            const moment = at(Number(w[1]), Number(w[2]), Number(w[3]), Number(w[4]), Number(w[5]), Number(w[6] ?? 0));
            return moment === null ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: w[6] === undefined ? 'short' : 'medium', timeZone: 'UTC' }).format(moment);
        }
    } catch {
        return value;
    }
    return value;
}

const DATED: ReadonlySet<TextFieldType> = new Set(['date', 'time', 'datetime-local']);

/**
 * One line of text (contract component `text-field`: default, focused, disabled, read-only, invalid, pinned), of any
 * native kind: a number, a date, a time or both bring the device's keyboard or picker. The server's constraints are the
 * input's own (`min`, `max`, `step`, `minlength`, `maxlength`, `required`). A date or time that is read-only or pinned
 * is written out in the person's locale, and keeps its ISO value in `data-value`.
 */
export function TextField({ label, help, error, disabled, readOnly, pinned, value, onChange, placeholder, type = 'text', name, locale, min, max, step, minLength, maxLength, required }: TextFieldProps): ReactNode {
    const id = useId();
    const fixed = readOnly === true || pinned != null;
    const shownAsText = fixed && DATED.has(type);
    const decimal = type === 'number' && (step === 'any' || (typeof step === 'number' && !Number.isInteger(step)));
    return (
        <Frame id={id} label={label} help={help} error={error} pinned={pinned}>
            <input
                id={id}
                name={name}
                type={shownAsText ? 'text' : type}
                className="cms-input"
                value={shownAsText ? writtenOut(type, value, locale) : value}
                {...(shownAsText ? { 'data-value': value } : {})}
                lang={locale}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={fixed}
                required={required}
                aria-required={required || undefined}
                min={shownAsText ? undefined : min}
                max={shownAsText ? undefined : max}
                step={shownAsText ? undefined : step}
                minLength={minLength}
                maxLength={maxLength}
                inputMode={type === 'number' ? (decimal ? 'decimal' : 'numeric') : undefined}
                aria-invalid={error != null || undefined}
                aria-describedby={describedBy(id, { help, error, pinned })}
                onChange={e => onChange?.(e.target.value)}
            />
        </Frame>
    );
}

export interface TextAreaProps extends FieldFrame, Pick<Constraints, 'minLength' | 'maxLength' | 'required'> {
    readonly value: string;
    readonly onChange?: (value: string) => void;
    readonly placeholder?: string;
    /** The lines it shows before it scrolls (4 by default); the person may make it taller. */
    readonly rows?: number;
    /** The person's locale (BCP 47): the field's language, for spelling and the input method. */
    readonly locale?: string;
    readonly pinned?: ReactNode;
    readonly name?: string;
}

/** Several lines of text: the text field's frame and states (`text-field`), with the server's length and need. */
export function TextArea({ label, help, error, disabled, readOnly, pinned, value, onChange, placeholder, rows = 4, name, locale, minLength, maxLength, required }: TextAreaProps): ReactNode {
    const id = useId();
    return (
        <Frame id={id} label={label} help={help} error={error} pinned={pinned}>
            <textarea
                id={id}
                name={name}
                className="cms-input cms-textarea"
                rows={rows}
                value={value}
                lang={locale}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly === true || pinned != null}
                required={required}
                aria-required={required || undefined}
                minLength={minLength}
                maxLength={maxLength}
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

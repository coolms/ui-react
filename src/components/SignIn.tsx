import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { withDefaults } from './internal';

export interface SignInFeature {
    readonly icon: IconName;
    readonly label: string;
}

export interface SignInLayoutProps {
    /** The brand mark: one letter, or an image. */
    readonly mark: ReactNode;
    readonly product: string;
    readonly headline: string;
    readonly lead: string;
    readonly features?: readonly SignInFeature[];
    /** The form, on the light side. */
    readonly children: ReactNode;
}

/** The one sign-in page of the admin and the Workspace: the brand on the dark side, the form on the light side. */
export function SignInLayout({ mark, product, headline, lead, features = [], children }: SignInLayoutProps): ReactNode {
    return (
        <div className="cms-signin">
            <aside className="cms-signin__brand">
                <p className="cms-signin__logo"><span className="cms-signin__mark" aria-hidden="true">{mark}</span>{product}</p>
                <div className="cms-signin__pitch">
                    <p className="cms-signin__headline">{headline}</p>
                    <p className="cms-signin__lead">{lead}</p>
                    {features.length ? (
                        <ul className="cms-signin__features">
                            {features.map(f => (
                                <li key={f.label}><Icon name={f.icon} size={18} />{f.label}</li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            </aside>
            <main className="cms-signin__form">{children}</main>
        </div>
    );
}

export interface SignInFormProps {
    /** The server signed in to, as its host. */
    readonly server: string;
    readonly onSubmit: (identifier: string, password: string) => void;
    readonly forgotHref?: string;
    readonly createHref?: string;
    /** The server's refusal, in its words. */
    readonly error?: string;
    readonly busy?: boolean;
    /** Its words, in the app's language; each left out is English. */
    readonly labels?: Partial<SignInLabels>;
}

/** The words the sign-in form says, in the app's language; English by default. */
export interface SignInLabels {
    readonly title: string;
    readonly identifier: string;
    readonly identifierPlaceholder: string;
    readonly password: string;
    readonly show: string;
    readonly hide: string;
    readonly forgot: string;
    readonly submit: string;
    readonly newHere: string;
    readonly create: string;
}

export const SIGN_IN_LABELS: SignInLabels = {
    title: 'Sign in',
    identifier: 'Email or username',
    identifierPlaceholder: 'name@example.com',
    password: 'Password',
    show: 'Show',
    hide: 'Hide',
    forgot: 'Forgot password?',
    submit: 'Sign in',
    newHere: 'New here?',
    create: 'Create an account',
};

/** Signing in with an identifier and a password; the password can be shown while typed. */
export function SignInForm({ server, onSubmit, forgotHref, createHref, error, busy, labels }: SignInFormProps): ReactNode {
    const l = withDefaults(SIGN_IN_LABELS, labels);
    const id = useId();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [shown, setShown] = useState(false);
    const submit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(identifier, password);
    };
    return (
        <form className="cms-signin-form" onSubmit={submit} aria-describedby={error ? `${id}-error` : undefined}>
            <h1 className="cms-signin-form__title">{l.title}</h1>
            <p className="cms-signin-form__server"><Icon name="server" size={18} />{server}</p>
            <label className="cms-signin-form__label" htmlFor={`${id}-identifier`}>{l.identifier}</label>
            <input
                id={`${id}-identifier`}
                className="cms-field"
                type="text"
                autoComplete="username"
                placeholder={l.identifierPlaceholder}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
            />
            <label className="cms-signin-form__label" htmlFor={`${id}-password`}>{l.password}</label>
            <span className="cms-signin-form__password">
                <input
                    id={`${id}-password`}
                    className="cms-field"
                    type={shown ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                <button type="button" className="cms-signin-form__show" aria-pressed={shown} onClick={() => setShown(s => !s)}>
                    {shown ? l.hide : l.show}
                </button>
            </span>
            {forgotHref ? <a className="cms-signin-form__forgot" href={forgotHref}>{l.forgot}</a> : null}
            {error ? <p id={`${id}-error`} className="cms-signin-form__error" role="alert">{error}</p> : null}
            <button type="submit" className="cms-button cms-button--chrome cms-signin-form__submit" disabled={busy} aria-busy={busy || undefined}>
                {l.submit}
            </button>
            {createHref ? (
                <>
                    <p className="cms-signin-form__or"><span>{l.newHere}</span></p>
                    <a className="cms-button cms-signin-form__create" href={createHref}>{l.create}</a>
                </>
            ) : null}
        </form>
    );
}

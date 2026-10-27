import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './internal';
import { Avatar } from './Structure';

export interface IncomingCallProps {
    /** Who is calling. */
    readonly name: string;
    readonly media: 'audio' | 'video';
    readonly onAccept: () => void;
    readonly onDecline: () => void;
}

/** A call ringing on this device: who, and Accept or Decline. An alert dialog, so a screen reader announces it. */
export function IncomingCall({ name, media, onAccept, onDecline }: IncomingCallProps): ReactNode {
    const what = media === 'video' ? 'Incoming video call' : 'Incoming audio call';
    return (
        <div className="cms-call-incoming" role="alertdialog" aria-label={`${what} from ${name}`}>
            <span className="cms-call-incoming__ring" aria-hidden="true">
                <Avatar name={name} size={112} />
            </span>
            <p className="cms-call-incoming__name">{name}</p>
            <p className="cms-call-incoming__what">{what}</p>
            <div className="cms-call-incoming__actions">
                <CallButton icon="phone-off" label="Decline" tone="hang-up" onClick={onDecline} />
                <CallButton icon="phone" label="Accept" tone="accept" onClick={onAccept} />
            </div>
        </div>
    );
}

interface CallButtonProps {
    readonly icon: IconName;
    readonly label: string;
    readonly onClick: () => void;
    readonly tone?: 'plain' | 'accept' | 'hang-up';
    /** For a control that stays on or off (mute, speaker). */
    readonly pressed?: boolean;
}

function CallButton({ icon, label, onClick, tone = 'plain', pressed }: CallButtonProps): ReactNode {
    return (
        <button
            type="button"
            className={cx('cms-call-button', `cms-call-button--${tone}`, pressed && 'is-pressed')}
            aria-pressed={pressed}
            onClick={onClick}
        >
            <span className="cms-call-button__disc"><Icon name={icon} size={24} /></span>
            <span className="cms-call-button__label">{label}</span>
        </button>
    );
}

export interface CallPanelProps {
    readonly name: string;
    /** How long the call has lasted ("04:12"). */
    readonly duration: string;
    /** What the call's statistics say of the connection. */
    readonly connection: 'good' | 'poor';
    /** This account, in the call: its name and whether it is speaking. */
    readonly you: { readonly name: string; readonly speaking: boolean };
    readonly muted: boolean;
    readonly speaker: boolean;
    readonly onToggleMute: () => void;
    readonly onToggleSpeaker: () => void;
    readonly onAddPerson?: () => void;
    readonly onChat?: () => void;
    readonly onHangUp: () => void;
}

/** A call in progress: who, how long, how the connection is, and its controls. */
export function CallPanel({ name, duration, connection, you, muted, speaker, onToggleMute, onToggleSpeaker, onAddPerson, onChat, onHangUp }: CallPanelProps): ReactNode {
    return (
        <section className="cms-call-panel" aria-label={`Call with ${name}`}>
            <div className="cms-call-panel__head">
                <Avatar name={name} size={64} />
                <div className="cms-call-panel__who">
                    <p className="cms-call-panel__name">{name}</p>
                    <p className="cms-call-panel__time" aria-label={`Call time ${duration}`}>{duration}</p>
                </div>
                <span className={cx('cms-pill', connection === 'good' ? 'cms-pill--success' : 'cms-pill--warning')}>
                    {connection === 'good' ? 'Good connection' : 'Poor connection'}
                </span>
            </div>
            <div className="cms-call-panel__you">
                <Avatar name={you.name} size={36} />
                <span>You</span>
                {you.speaking ? <span className="cms-call-panel__level" role="img" aria-label="Speaking" /> : null}
            </div>
            <div className="cms-call-panel__controls">
                <CallButton icon="mic" label={muted ? 'Unmute' : 'Mute'} pressed={muted} onClick={onToggleMute} />
                <CallButton icon="speaker" label="Speaker" pressed={speaker} onClick={onToggleSpeaker} />
                {onAddPerson ? <CallButton icon="user-plus" label="Add person" onClick={onAddPerson} /> : null}
                {onChat ? <CallButton icon="chat" label="Chat" onClick={onChat} /> : null}
                <CallButton icon="phone-off" label="Hang up" tone="hang-up" onClick={onHangUp} />
            </div>
        </section>
    );
}

export interface CallBarProps {
    readonly name: string;
    readonly duration: string;
    readonly muted: boolean;
    readonly onToggleMute: () => void;
    readonly onReturn: () => void;
    readonly onHangUp: () => void;
}

/** The call, kept in view while another section is open: who, how long, mute, back to it, hang up. */
export function CallBar({ name, duration, muted, onToggleMute, onReturn, onHangUp }: CallBarProps): ReactNode {
    return (
        <section className="cms-call-bar" aria-label={`Call with ${name}`}>
            <span className="cms-call-bar__live" aria-hidden="true" />
            <span className="cms-call-bar__name">On a call with {name}</span>
            <span className="cms-call-bar__time">{duration}</span>
            <span className="cms-call-bar__actions">
                <button type="button" className="cms-call-bar__icon" aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} onClick={onToggleMute}>
                    <Icon name="mic" />
                </button>
                <button type="button" className="cms-button cms-button--primary" onClick={onReturn}>Return to call</button>
                <button type="button" className="cms-call-bar__icon cms-call-bar__icon--hang-up" aria-label="Hang up" onClick={onHangUp}>
                    <Icon name="phone-off" />
                </button>
            </span>
        </section>
    );
}

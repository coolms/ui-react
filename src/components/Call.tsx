import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './internal';
import { Avatar } from './Structure';

/** The words a call's components say, in the app's language; English by default. */
export interface CallLabels {
    readonly incomingAudio: string;
    readonly incomingVideo: string;
    /** The incoming card's name for a screen reader: what is ringing, and who calls. */
    readonly incomingFrom: (what: string, name: string) => string;
    readonly accept: string;
    readonly decline: string;
    readonly callWith: (name: string) => string;
    readonly callTime: (duration: string) => string;
    readonly goodConnection: string;
    readonly poorConnection: string;
    readonly you: string;
    readonly speaking: string;
    readonly mute: string;
    readonly unmute: string;
    readonly speaker: string;
    readonly addPerson: string;
    readonly chat: string;
    readonly hangUp: string;
    readonly onCallWith: (name: string) => string;
    readonly returnToCall: string;
}

export const CALL_LABELS: CallLabels = {
    incomingAudio: 'Incoming audio call',
    incomingVideo: 'Incoming video call',
    incomingFrom: (what, name) => `${what} from ${name}`,
    accept: 'Accept',
    decline: 'Decline',
    callWith: (name) => `Call with ${name}`,
    callTime: (duration) => `Call time ${duration}`,
    goodConnection: 'Good connection',
    poorConnection: 'Poor connection',
    you: 'You',
    speaking: 'Speaking',
    mute: 'Mute',
    unmute: 'Unmute',
    speaker: 'Speaker',
    addPerson: 'Add person',
    chat: 'Chat',
    hangUp: 'Hang up',
    onCallWith: (name) => `On a call with ${name}`,
    returnToCall: 'Return to call',
};

export interface IncomingCallProps {
    /** Who is calling. */
    readonly name: string;
    readonly media: 'audio' | 'video';
    readonly onAccept: () => void;
    readonly onDecline: () => void;
    /** Its words, in the app's language; each left out is English. */
    readonly labels?: Partial<CallLabels>;
}

/** A call ringing on this device: who, and Accept or Decline. An alert dialog, so a screen reader announces it. */
export function IncomingCall({ name, media, onAccept, onDecline, labels }: IncomingCallProps): ReactNode {
    const l = { ...CALL_LABELS, ...labels };
    const what = media === 'video' ? l.incomingVideo : l.incomingAudio;
    return (
        <div className="cms-call-incoming" role="alertdialog" aria-label={l.incomingFrom(what, name)}>
            <span className="cms-call-incoming__ring" aria-hidden="true">
                <Avatar name={name} size={112} />
            </span>
            <p className="cms-call-incoming__name">{name}</p>
            <p className="cms-call-incoming__what">{what}</p>
            <div className="cms-call-incoming__actions">
                <CallButton icon="phone-off" label={l.decline} tone="hang-up" onClick={onDecline} />
                <CallButton icon="phone" label={l.accept} tone="accept" onClick={onAccept} />
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
    /** Its words, in the app's language; each left out is English. */
    readonly labels?: Partial<CallLabels>;
}

/** A call in progress: who, how long, how the connection is, and its controls. */
export function CallPanel({ name, duration, connection, you, muted, speaker, onToggleMute, onToggleSpeaker, onAddPerson, onChat, onHangUp, labels }: CallPanelProps): ReactNode {
    const l = { ...CALL_LABELS, ...labels };
    return (
        <section className="cms-call-panel" aria-label={l.callWith(name)}>
            <div className="cms-call-panel__head">
                <Avatar name={name} size={64} />
                <div className="cms-call-panel__who">
                    <p className="cms-call-panel__name">{name}</p>
                    <p className="cms-call-panel__time" aria-label={l.callTime(duration)}>{duration}</p>
                </div>
                <span className={cx('cms-pill', connection === 'good' ? 'cms-pill--success' : 'cms-pill--warning')}>
                    {connection === 'good' ? l.goodConnection : l.poorConnection}
                </span>
            </div>
            <div className="cms-call-panel__you">
                <Avatar name={you.name} size={36} />
                <span>{l.you}</span>
                {you.speaking ? <span className="cms-call-panel__level" role="img" aria-label={l.speaking} /> : null}
            </div>
            <div className="cms-call-panel__controls">
                <CallButton icon="mic" label={muted ? l.unmute : l.mute} pressed={muted} onClick={onToggleMute} />
                <CallButton icon="speaker" label={l.speaker} pressed={speaker} onClick={onToggleSpeaker} />
                {onAddPerson ? <CallButton icon="user-plus" label={l.addPerson} onClick={onAddPerson} /> : null}
                {onChat ? <CallButton icon="chat" label={l.chat} onClick={onChat} /> : null}
                <CallButton icon="phone-off" label={l.hangUp} tone="hang-up" onClick={onHangUp} />
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
    /** Its words, in the app's language; each left out is English. */
    readonly labels?: Partial<CallLabels>;
}

/** The call, kept in view while another section is open: who, how long, mute, back to it, hang up. */
export function CallBar({ name, duration, muted, onToggleMute, onReturn, onHangUp, labels }: CallBarProps): ReactNode {
    const l = { ...CALL_LABELS, ...labels };
    return (
        <section className="cms-call-bar" aria-label={l.callWith(name)}>
            <span className="cms-call-bar__live" aria-hidden="true" />
            <span className="cms-call-bar__name">{l.onCallWith(name)}</span>
            <span className="cms-call-bar__time">{duration}</span>
            <span className="cms-call-bar__actions">
                <button type="button" className="cms-call-bar__icon" aria-label={muted ? l.unmute : l.mute} aria-pressed={muted} onClick={onToggleMute}>
                    <Icon name="mic" />
                </button>
                <button type="button" className="cms-button cms-button--primary" onClick={onReturn}>{l.returnToCall}</button>
                <button type="button" className="cms-call-bar__icon cms-call-bar__icon--hang-up" aria-label={l.hangUp} onClick={onHangUp}>
                    <Icon name="phone-off" />
                </button>
            </span>
        </section>
    );
}

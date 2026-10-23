/**
 * What a declared action comes to for this caller on this subject, as the server answered it in the subject's
 * capabilities map (contract: server state `capability`, reactions R3 and R4). An action is offered from that answer
 * only -- never computed from mode bits, owner, membership or role.
 *
 *   allowed  offered
 *   elevate  offered locked by a client that elevates; not offered by one that never does
 *   denied   not offered, or offered disabled with the server's refusal when the client shows why
 *   anything else -- a state this client does not know -- is denied, and said (R4)
 */
export type Capability = 'allowed' | 'elevate' | 'denied';

export interface Offer {
    /** Whether the action is shown at all. */
    readonly offered: boolean;
    /** Shown, but behind elevation (only in a client that elevates). */
    readonly locked: boolean;
    /** Shown, but refused: the refusal in words, as the server gave it. */
    readonly refusal?: string;
    /** The server's answer was not one this client knows (R4): treated as denied. */
    readonly unknown?: boolean;
}

export interface OfferOptions {
    /** Whether this client can ask for elevation (theme-admin does; a workspace client does not). */
    readonly elevates: boolean;
    /** Show a denied action disabled, with its refusal, instead of leaving it out. */
    readonly showRefused?: boolean;
    /** The server's refusal phrase for a denied action, when it gave one. */
    readonly refusal?: string;
}

export function isCapability(answer: unknown): answer is Capability {
    return answer === 'allowed' || answer === 'elevate' || answer === 'denied';
}

export function offerFor(answer: unknown, options: OfferOptions): Offer {
    if (!isCapability(answer)) {
        return options.showRefused
            ? { offered: true, locked: false, refusal: 'not available: the server gave an answer this app does not know', unknown: true }
            : { offered: false, locked: false, unknown: true };
    }
    switch (answer) {
        case 'allowed':
            return { offered: true, locked: false };
        case 'elevate':
            return options.elevates ? { offered: true, locked: true } : { offered: false, locked: false };
        case 'denied':
            return options.showRefused
                ? { offered: true, locked: false, refusal: options.refusal ?? 'not allowed' }
                : { offered: false, locked: false };
    }
}

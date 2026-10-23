/**
 * A write that named the version it read (If-Match) and answered 412 changed nothing (contract: server state
 * `versioned-write`, reaction R5): say so and offer to read again -- never resend the write over what changed.
 */
export interface Conflict {
    readonly conflict: boolean;
    readonly message?: string;
}

export function readConflict(status: number): Conflict {
    return status === 412
        ? { conflict: true, message: 'Someone changed this since you opened it. Nothing was saved; read it again to see the change.' }
        : { conflict: false };
}

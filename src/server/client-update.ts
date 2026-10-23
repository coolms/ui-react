/**
 * Whether this client's version is still supported (contract: server state `client-version`, reaction R6): a response
 * typed /errors/client-update-required (any status), or a discovery minimumVersion above this client's version, means
 * stop using that server and say an update is needed.
 */
export const CLIENT_UPDATE_REQUIRED = '/errors/client-update-required';

/** Compares dotted numeric versions ("1.10.2" > "1.9"); a part that is not a number counts as 0. */
export function versionBelow(version: string, minimum: string): boolean {
    const a = version.split('.').map(n => Number.parseInt(n, 10) || 0);
    const b = minimum.split('.').map(n => Number.parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] ?? 0;
        const y = b[i] ?? 0;
        if (x !== y) return x < y;
    }
    return false;
}

export function needsClientUpdate(input: {
    readonly problemType?: string | undefined;
    readonly minimumVersion?: string | undefined;
    readonly version: string;
}): boolean {
    if (input.problemType !== undefined && input.problemType.endsWith(CLIENT_UPDATE_REQUIRED)) return true;
    return input.minimumVersion !== undefined && versionBelow(input.version, input.minimumVersion);
}

/**
 * Whether an action is allowed NOW is the action's own response (contract: server state `action-now`, reaction R2):
 * a 403 stamped X-Elevation-Required asks for elevation -- a client that never elevates says it cannot do that here --
 * and any other 403 is a refusal, quoted as the server gave it. A flag read earlier never stands in for it.
 */
export type Refusal =
    | { readonly kind: 'none' }
    | { readonly kind: 'elevation-required'; readonly message: string }
    | { readonly kind: 'refused'; readonly message: string };

type HeaderSource = Headers | Readonly<Record<string, string | undefined>>;

function header(headers: HeaderSource | undefined, name: string): string | undefined {
    if (!headers) return undefined;
    if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name) ?? undefined;
    const record = headers as Readonly<Record<string, string | undefined>>;
    const key = Object.keys(record).find(k => k.toLowerCase() === name.toLowerCase());
    return key === undefined ? undefined : record[key];
}

/** The server's own words for a refusal: a problem+json `detail`, else its `title`. */
export function refusalText(body: unknown): string | undefined {
    if (body && typeof body === 'object') {
        const b = body as { detail?: unknown; title?: unknown };
        if (typeof b.detail === 'string' && b.detail !== '') return b.detail;
        if (typeof b.title === 'string' && b.title !== '') return b.title;
    }
    return undefined;
}

export function readRefusal(
    status: number,
    headers: HeaderSource | undefined,
    body: unknown,
    options: { elevates: boolean },
): Refusal {
    if (status !== 403) return { kind: 'none' };
    const said = refusalText(body);
    if (header(headers, 'X-Elevation-Required') !== undefined) {
        return options.elevates
            ? { kind: 'elevation-required', message: said ?? 'This needs an elevated session.' }
            : { kind: 'refused', message: 'This can only be done in the admin, in an elevated session.' };
    }
    return { kind: 'refused', message: said ?? 'The server refused this.' };
}

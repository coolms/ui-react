import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { offerFor } from '../src/server/capability';
import { needsClientUpdate, versionBelow } from '../src/server/client-update';
import { readConflict } from '../src/server/conflict';
import { readRefusal } from '../src/server/refusal';
import { rereadAll, useReread } from '../src/server/reread';

describe('offerFor (R3, R4)', () => {
    it('offers allowed, and offers elevate locked only where the client elevates', () => {
        expect(offerFor('allowed', { elevates: false })).toEqual({ offered: true, locked: false });
        expect(offerFor('elevate', { elevates: true })).toEqual({ offered: true, locked: true });
        expect(offerFor('elevate', { elevates: false })).toEqual({ offered: false, locked: false });
    });

    it('leaves denied out, or shows the server refusal when asked to', () => {
        expect(offerFor('denied', { elevates: false }).offered).toBe(false);
        expect(offerFor('denied', { elevates: false, showRefused: true, refusal: 'The space is read-only' }))
            .toEqual({ offered: true, locked: false, refusal: 'The space is read-only' });
    });

    it('treats an answer it does not know as denied, never as permission', () => {
        for (const answer of ['ALLOWED', 'maybe', true, 1, null, undefined]) {
            const offer = offerFor(answer, { elevates: true });
            expect(offer.offered).toBe(false);
            expect(offer.unknown).toBe(true);
        }
        expect(offerFor('granted', { elevates: false, showRefused: true }).refusal).toMatch(/does not know/);
    });
});

describe('readRefusal (R2)', () => {
    it('is no refusal unless the answer is 403', () => {
        expect(readRefusal(200, undefined, null, { elevates: true })).toEqual({ kind: 'none' });
        expect(readRefusal(401, undefined, null, { elevates: true })).toEqual({ kind: 'none' });
    });

    it('quotes the server on a plain 403', () => {
        expect(readRefusal(403, new Headers(), { detail: 'Only the owner can share this.' }, { elevates: false }))
            .toEqual({ kind: 'refused', message: 'Only the owner can share this.' });
    });

    it('reads X-Elevation-Required in any case; a client that never elevates says it cannot here', () => {
        const headers = { 'x-elevation-required': '1' };
        expect(readRefusal(403, headers, { title: 'Elevate' }, { elevates: true }).kind).toBe('elevation-required');
        const here = readRefusal(403, headers, { title: 'Elevate' }, { elevates: false });
        expect(here.kind).toBe('refused');
        expect(here.kind === 'refused' && here.message).toMatch(/admin/);
    });
});

describe('readConflict (R5) and needsClientUpdate (R6)', () => {
    it('says a 412 changed nothing', () => {
        expect(readConflict(412).conflict).toBe(true);
        expect(readConflict(412).message).toMatch(/Nothing was saved/);
        expect(readConflict(409).conflict).toBe(false);
    });

    it('compares versions part by part, numerically', () => {
        expect(versionBelow('1.9.0', '1.10')).toBe(true);
        expect(versionBelow('1.10', '1.9.9')).toBe(false);
        expect(versionBelow('2.0', '2.0.0')).toBe(false);
    });

    it('needs an update on the problem type or a minimum above this version', () => {
        expect(needsClientUpdate({ problemType: 'https://example.test/errors/client-update-required', version: '9.9' })).toBe(true);
        expect(needsClientUpdate({ minimumVersion: '1.2.0', version: '1.1.9' })).toBe(true);
        expect(needsClientUpdate({ minimumVersion: '1.2.0', version: '1.2.0' })).toBe(false);
        expect(needsClientUpdate({ version: '0.0.1' })).toBe(false);
    });
});

describe('useReread (R1)', () => {
    it('reads on mount, on focus and on rereadAll', async () => {
        let n = 0;
        const read = vi.fn(() => Promise.resolve(++n));
        const { result } = renderHook(() => useReread(read));
        await waitFor(() => expect(result.current.value).toBe(1));
        act(() => window.dispatchEvent(new Event('focus')));
        await waitFor(() => expect(result.current.value).toBe(2));
        act(() => rereadAll());
        await waitFor(() => expect(result.current.value).toBe(3));
        expect(read).toHaveBeenCalledTimes(3);
    });

    it('drops an answer that arrives after a newer read began', async () => {
        const resolvers: Array<(v: string) => void> = [];
        const read = () => new Promise<string>(r => resolvers.push(r));
        const { result } = renderHook(() => useReread(read));
        act(() => rereadAll());
        await act(async () => {
            resolvers[1]!('new');
            resolvers[0]!('old');
        });
        expect(result.current.value).toBe('new');
    });
});

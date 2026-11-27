import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import css from '../src/kit.css?raw';
import { Column, SplitPanes } from '../src/index.js';

/** The declarations of the kit's top-level rule for one selector. */
function rule(selector: string): string {
    const at = css.indexOf(`\n${selector} {`);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return css.slice(at, css.indexOf('}', at));
}

describe('a column: a head that stays, a body that scrolls', () => {
    it('draws the head outside the scroll region and the content inside it', () => {
        const { container } = render(<Column head={<h2>Conversations</h2>}><ul><li>One</li></ul></Column>);
        const head = container.querySelector('.cms-column > .cms-column__head');
        const body = container.querySelector('.cms-column > .cms-column__body');
        expect(head).toContainElement(screen.getByRole('heading', { name: 'Conversations' }));
        expect(body).toContainElement(screen.getByRole('list'));
        expect(body).not.toContainElement(screen.getByRole('heading'));
    });

    it('gives the host its scroll region: the ref, the scroll events and its attributes', () => {
        const box = createRef<HTMLDivElement>();
        const onScroll = vi.fn();
        render(<Column head="Head" scrollRef={box} onScroll={onScroll} bodyProps={{ 'data-list': 'conversations', 'aria-label': 'Conversations' }}>rows</Column>);
        expect(box.current).toHaveClass('cms-column__body');
        expect(box.current).toHaveAttribute('data-list', 'conversations');
        expect(box.current).toHaveAttribute('aria-label', 'Conversations');
        fireEvent.scroll(box.current!);
        expect(onScroll).toHaveBeenCalledTimes(1);
    });

    it('draws no head without one', () => {
        const { container } = render(<Column>rows</Column>);
        expect(container.querySelector('.cms-column__head')).toBeNull();
    });

    it('fills a pane of SplitPanes', () => {
        const { container } = render(<SplitPanes panes={[{ label: 'List', content: <Column head="Head">rows</Column> }, { label: 'Open', content: 'open' }]} />);
        expect(container.querySelector('.cms-panes__pane > .cms-column')).not.toBeNull();
    });
});

// The contract's grid: under each pane's action row, exactly one scroll region. The pane is a column of its own, so a
// Column in it fills its height and only the Column's body scrolls; content that is not a Column scrolls with the pane.
describe('the column rules', () => {
    it('the body takes the rest of the height and is the one that scrolls', () => {
        expect(rule('.cms-column')).toMatch(/display: flex; flex-direction: column; flex: 1 1 auto; height: 100%;[^}]*min-height: 0;/);
        expect(rule('.cms-column__head')).toMatch(/flex: none;/);
        expect(rule('.cms-column__body')).toMatch(/flex: 1 1 auto; min-height: 0; overflow-y: auto;/);
    });

    it('in a screen shell the shell\'s content stays the one scroll region: a column there grows with its list', () => {
        expect(rule('.cms-screen__content .cms-column')).toMatch(/flex: none; height: auto;/);
        expect(rule('.cms-screen__content .cms-column__body')).toMatch(/overflow-y: visible;/);
    });

    it('a pane lays its content out as a column at every width, never as a block', () => {
        expect(rule('.cms-panes__pane')).toMatch(/display: flex; flex-direction: column;/);
        expect(css).not.toMatch(/\.cms-panes__pane[^{]*\{[^}]*display: block/);
        expect(rule('.cms-panes__back')).toMatch(/flex: none;/);
    });
});

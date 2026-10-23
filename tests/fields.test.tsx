import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Select, TextField, Toggle } from '../src';

describe('Button', () => {
    it('busy: keeps its place, says so, cannot be pressed twice', async () => {
        const onClick = vi.fn();
        render(<Button busy busyLabel="Saving" onClick={onClick}>Save</Button>);
        const b = screen.getByRole('button', { name: 'Saving' });
        expect(b).toHaveAttribute('aria-busy', 'true');
        expect(b).toBeDisabled();
        await userEvent.click(b);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('locked: stays pressable and names why', async () => {
        const onClick = vi.fn();
        render(<Button locked lockedReason="needs an elevated session" onClick={onClick}>Delete</Button>);
        const b = screen.getByRole('button', { name: /^Delete.*needs an elevated session$/ });
        expect(b).toHaveClass('is-locked');
        await userEvent.click(b);
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('draws the variant it is given', () => {
        render(<><Button variant="primary">A</Button><Button variant="danger">B</Button></>);
        expect(screen.getByRole('button', { name: 'A' })).toHaveClass('cms-button--primary');
        expect(screen.getByRole('button', { name: 'B' })).toHaveClass('cms-button--danger');
    });
});

describe('TextField', () => {
    it('invalid: marked, and the error describes the input', () => {
        render(<TextField label="Name" value="" error="A name is needed" help="Shown to others" />);
        const input = screen.getByLabelText('Name');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription('A name is needed Shown to others');
    });

    it('pinned: read-only, and says what pins it', async () => {
        const onChange = vi.fn();
        render(<TextField label="Host" value="mail.example.test" pinned="Set by MAIL_HOST in the environment" onChange={onChange} />);
        const input = screen.getByLabelText('Host');
        expect(input).toHaveAttribute('readonly');
        expect(input).toHaveAccessibleDescription(/MAIL_HOST/);
        await userEvent.type(input, 'x');
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('Select', () => {
    it('empty-list: disabled, and says why', () => {
        render(<Select label="Folder" value="" options={[]} emptyText="No folders yet." />);
        const s = screen.getByLabelText('Folder');
        expect(s).toBeDisabled();
        expect(s).toHaveAccessibleDescription('No folders yet.');
    });

    it('read-only: the value does not change', async () => {
        const onChange = vi.fn();
        const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
        render(<Select label="Kind" value="a" options={options} readOnly onChange={onChange} />);
        await userEvent.selectOptions(screen.getByLabelText('Kind'), 'b').catch(() => undefined);
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('Toggle', () => {
    it('on/off is a switch the label names', async () => {
        const onChange = vi.fn();
        render(<Toggle label="Notify me" checked={false} onChange={onChange} />);
        const t = screen.getByRole('switch', { name: 'Notify me' });
        expect(t).toHaveAttribute('aria-checked', 'false');
        await userEvent.click(t);
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('read-only does not change', async () => {
        const onChange = vi.fn();
        render(<Toggle label="Notify me" checked readOnly onChange={onChange} />);
        await userEvent.click(screen.getByRole('switch'));
        expect(onChange).not.toHaveBeenCalled();
    });
});

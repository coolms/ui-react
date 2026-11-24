import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Select, SignInForm, TextArea, TextField, Toggle, writtenOut } from '../src';
import css from '../src/kit.css?raw';

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

    it('draws the quiet variant', () => {
        render(<Button variant="quiet">Reply</Button>);
        expect(screen.getByRole('button', { name: 'Reply' })).toHaveClass('cms-button', 'cms-button--quiet');
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

describe('a field\'s frame', () => {
    it('is a column of label, box and help: no rule of the kit draws a box on the frame itself', () => {
        const onFrame = [...css.matchAll(/(^|\n)([^{}\n]*)\{([^}]*)\}/g)]
            .filter((rule) => rule[2]!.split(',').some((selector: string) => /\.cms-field(:[\w-]+)?$/.test(selector.trim())))
            .map((rule) => rule[3]!);
        expect(onFrame.length).toBeGreaterThan(0);
        for (const body of onFrame) expect(body).not.toMatch(/(^|;)\s*(height|border|padding|background)\s*:/);
    });

    it('the sign-in form\'s inputs are its own, not a field\'s frame', () => {
        render(<SignInForm server="demo.example.test" onSubmit={() => undefined} />);
        for (const input of [screen.getByLabelText('Email or username'), screen.getByLabelText('Password')]) {
            expect(input).toHaveClass('cms-signin-form__input');
            expect(input).not.toHaveClass('cms-field');
        }
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

describe('TextField kinds and constraints', () => {
    it('a number: the native input with the server\'s bounds and step, and the keyboard that fits it', () => {
        render(<><TextField label="Amount" type="number" value="12.5" min={0} max={10000} step={0.01} required /><TextField label="Nights" type="number" value="2" min={1} step={1} /></>);
        const amount = screen.getByRole('spinbutton', { name: 'Amount' });
        expect(amount).toHaveAttribute('min', '0');
        expect(amount).toHaveAttribute('max', '10000');
        expect(amount).toHaveAttribute('step', '0.01');
        expect(amount).toHaveAttribute('inputmode', 'decimal');
        expect(amount).toBeRequired();
        expect(amount).toHaveAttribute('aria-required', 'true');
        expect(screen.getByRole('spinbutton', { name: 'Nights' })).toHaveAttribute('inputmode', 'numeric');
    });

    it('a date, a time and both: the native pickers, holding ISO values, with their bounds', async () => {
        const onChange = vi.fn();
        render(<><TextField label="Day" type="date" value="2026-11-18" min="2026-01-01" max="2026-12-31" onChange={onChange} locale="de-DE" /><TextField label="At" type="time" value="14:30" step={900} /><TextField label="When" type="datetime-local" value="2026-11-18T14:30" /></>);
        const day = screen.getByLabelText('Day');
        expect(day).toHaveAttribute('type', 'date');
        expect(day).toHaveValue('2026-11-18');
        expect(day).toHaveAttribute('min', '2026-01-01');
        expect(day).toHaveAttribute('lang', 'de-DE');
        expect(screen.getByLabelText('At')).toHaveAttribute('type', 'time');
        expect(screen.getByLabelText('At')).toHaveAttribute('step', '900');
        expect(screen.getByLabelText('When')).toHaveAttribute('type', 'datetime-local');
        await userEvent.clear(day);
        expect(onChange).toHaveBeenLastCalledWith('');
    });

    it('a read-only or pinned date or time is written out in the person\'s locale, its ISO value kept', () => {
        render(<><TextField label="Day" type="date" value="2026-11-18" readOnly locale="en-GB" /><TextField label="When" type="datetime-local" value="2026-11-18T14:30" pinned="Set by the deployment" locale="de-DE" /><TextField label="At" type="time" value="09:05" readOnly locale="en-US" /></>);
        const day = screen.getByLabelText('Day');
        expect(day).toHaveAttribute('type', 'text');
        expect(day).toHaveValue('18 Nov 2026');
        expect(day).toHaveAttribute('data-value', '2026-11-18');
        expect(day).toHaveAttribute('readonly');
        expect(screen.getByLabelText('When')).toHaveValue('18.11.2026, 14:30');
        expect((screen.getByLabelText('At') as HTMLInputElement).value).toMatch(/^9:05\sAM$/);
    });

    it('writes out a value that is not of its type as it is, and never shifts a date by a time zone', () => {
        expect(writtenOut('date', 'tomorrow', 'en-GB')).toBe('tomorrow');
        expect(writtenOut('date', '2026-02-30', 'en-GB')).toBe('2026-02-30');
        expect(writtenOut('time', '25:61', 'en-GB')).toBe('25:61');
        expect(writtenOut('time', '23:60', 'en-GB')).toBe('23:60');
        expect(writtenOut('datetime-local', '2026-13-01T10:00', 'en-GB')).toBe('2026-13-01T10:00');
        expect(writtenOut('datetime-local', '2026-04-31T24:00', 'en-GB')).toBe('2026-04-31T24:00');
        expect(writtenOut('date', '2024-02-29', 'en-GB')).toBe('29 Feb 2024');
        expect(writtenOut('date', '0099-05-01', 'en-GB')).not.toContain('1999');
        expect(writtenOut('date', '2026-01-01', 'en-GB')).toBe('1 Jan 2026');
        expect(writtenOut('time', '23:59:30', 'en-GB')).toBe('23:59:30');
    });

    it('text lengths come from the server', () => {
        render(<TextField label="Title" value="" minLength={3} maxLength={80} />);
        expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAttribute('maxlength', '80');
        expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAttribute('minlength', '3');
    });
});

describe('TextArea', () => {
    it('several lines in the text field\'s frame: label, help, error, length and need', async () => {
        const onChange = vi.fn();
        render(<TextArea label="Reason" help="Why the expense was needed" error="Say why" value="" maxLength={500} required onChange={onChange} />);
        const area = screen.getByRole('textbox', { name: 'Reason' });
        expect(area.tagName).toBe('TEXTAREA');
        expect(area).toHaveAttribute('rows', '4');
        expect(area).toHaveAttribute('maxlength', '500');
        expect(area).toBeRequired();
        expect(area).toHaveAttribute('aria-invalid', 'true');
        expect(area).toHaveAccessibleDescription('Say why Why the expense was needed');
        await userEvent.type(area, 'A{Enter}B');
        expect(onChange).toHaveBeenLastCalledWith('B');
    });

    it('read-only and pinned are not changed here', () => {
        render(<><TextArea label="Note" value="Fixed" readOnly /><TextArea label="Policy" value="P" pinned="Set by the deployment" /></>);
        expect(screen.getByRole('textbox', { name: 'Note' })).toHaveAttribute('readonly');
        expect(screen.getByRole('textbox', { name: 'Policy' })).toHaveAttribute('readonly');
    });
});

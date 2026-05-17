import { describe, it, expect } from 'vitest';
import {
  FieldDefinition,
  isTextField,
  isBooleanField,
  isNumberField,
} from './app.model';

describe('isTextField', () => {
  it('returns true for a text field', () => {
    const f: FieldDefinition = { type: 'text', label: 'Notes', hidden: false, order: 0 };
    expect(isTextField(f)).toBe(true);
  });

  it('returns false for a boolean field', () => {
    const f: FieldDefinition = { type: 'boolean', label: 'Good', hidden: false, order: 0 };
    expect(isTextField(f)).toBe(false);
  });

  it('returns false for a number field', () => {
    const f: FieldDefinition = { type: 'number', label: 'Energy', hidden: false, order: 0, range: [0, 10] };
    expect(isTextField(f)).toBe(false);
  });
});

describe('isBooleanField', () => {
  it('returns true for a boolean field', () => {
    const f: FieldDefinition = { type: 'boolean', label: 'Good', hidden: false, order: 0 };
    expect(isBooleanField(f)).toBe(true);
  });

  it('returns false for a text field', () => {
    const f: FieldDefinition = { type: 'text', label: 'Notes', hidden: false, order: 0 };
    expect(isBooleanField(f)).toBe(false);
  });
});

describe('isNumberField', () => {
  it('returns true for a number field', () => {
    const f: FieldDefinition = { type: 'number', label: 'Energy', hidden: false, order: 0, range: [0, 10] };
    expect(isNumberField(f)).toBe(true);
  });

  it('returns false for a text field', () => {
    const f: FieldDefinition = { type: 'text', label: 'Notes', hidden: false, order: 0 };
    expect(isNumberField(f)).toBe(false);
  });
});

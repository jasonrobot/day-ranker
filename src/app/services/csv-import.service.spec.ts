// src/app/services/csv-import.service.spec.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { CsvImportService } from './csv-import.service';

describe('CsvImportService', () => {
  let service: CsvImportService;

  beforeEach(() => {
    service = new CsvImportService();
  });

  it('parses a well-formed CSV and returns correct YearState', () => {
    const csv = '2025-01-15,3,Great day\n2025-06-20,-2,bad day';
    const result = service.parse(csv);

    expect(result).not.toBeNull();
    expect(result!.year).toBe(2025);
    expect(result!.state.months[0].days[14].score).toBe(3);
    expect(result!.state.months[0].days[14].comment).toBe('Great day');
    expect(result!.state.months[5].days[19].score).toBe(-2);
    expect(result!.state.months[5].days[19].comment).toBe('bad day');
  });

  it('preserves commas inside comments', () => {
    const csv = '2025-03-10,1,good, not great, but okay';
    const result = service.parse(csv);

    expect(result!.state.months[2].days[9].comment).toBe('good, not great, but okay');
  });

  it('excludes rows whose year does not match the detected year', () => {
    const csv = '2025-01-01,1,first\n2024-06-15,2,other year\n2025-02-01,3,also 2025';
    const result = service.parse(csv);

    expect(result!.year).toBe(2025);
    expect(result!.state.months[0].days[0].score).toBe(1);
    expect(result!.state.months[1].days[0].score).toBe(3);
    // 2024 row not loaded — June 15 should be default 0
    expect(result!.state.months[5].days[14].score).toBe(0);
  });

  it('skips rows with an invalid date format without throwing', () => {
    const csv = 'not-a-date,1,comment\n2025-01-01,2,valid';
    const result = service.parse(csv);

    expect(result).not.toBeNull();
    expect(result!.state.months[0].days[0].score).toBe(2);
  });

  it('skips rows with a non-numeric score without throwing', () => {
    const csv = '2025-04-05,bad,comment\n2025-04-06,1,valid';
    const result = service.parse(csv);

    expect(result!.state.months[3].days[4].score).toBe(0);
    expect(result!.state.months[3].days[5].score).toBe(1);
  });

  it('skips blank lines without throwing', () => {
    const csv = '\n2025-01-01,1,fine\n\n';
    const result = service.parse(csv);

    expect(result).not.toBeNull();
    expect(result!.state.months[0].days[0].score).toBe(1);
  });

  it('returns null for empty input', () => {
    expect(service.parse('')).toBeNull();
  });

  it('returns null when no valid rows exist', () => {
    expect(service.parse('bad-line\nanother-bad-line')).toBeNull();
  });

  it('handles a leap year correctly (Feb 29)', () => {
    const csv = '2024-02-29,2,leap day';
    const result = service.parse(csv);

    expect(result!.state.months[1].days[28].score).toBe(2);
    expect(result!.state.months[1].days[28].comment).toBe('leap day');
  });

  it('initializes unset days to score 0 and empty comment', () => {
    const csv = '2025-07-04,1,holiday';
    const result = service.parse(csv);

    expect(result!.state.months[0].days[0].score).toBe(0);
    expect(result!.state.months[0].days[0].comment).toBe('');
  });
});

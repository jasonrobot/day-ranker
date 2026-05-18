import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CalendarStore } from './calendar.store';
import { StorageService } from '../services/storage.service';
import { YearState } from '../models/app.model';

const CURRENT_YEAR = new Date().getFullYear();

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

describe('CalendarStore', () => {
  let store: InstanceType<typeof CalendarStore>;
  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue({ customFields: [] }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    });
    store = TestBed.inject(CalendarStore);
  });

  describe('hydrate', () => {
    it('replaces all months with the provided state', () => {
      const state: YearState = {
        months: Array.from({ length: 12 }, () => ({
          days: [{ score: 2, comment: 'loaded' }],
        })),
      };

      store.hydrate(CURRENT_YEAR, state);

      expect(store.months()[0].days[0].score).toBe(2);
      expect(store.months()[0].days[0].comment).toBe('loaded');
    });
  });

  describe('reset', () => {
    it('restores all day scores to null and comments to empty string', () => {
      store.updateDay(0, 0, { score: 3, comment: 'test' });
      store.reset();

      expect(store.months()[0].days[0].score).toBeNull();
      expect(store.months()[0].days[0].comment).toBe('');
    });

    it('restores the correct number of days per month', () => {
      store.reset();

      store.months().forEach((month, monthIdx) => {
        expect(month.days.length).toBe(getDaysInMonth(CURRENT_YEAR, monthIdx));
      });
    });
  });

  describe('updateDay', () => {
    it('calls storageService.saveYear with the correct year after updating a day', () => {
      store.updateDay(0, 0, { score: 2 });

      expect(mockStorageService.saveYear).toHaveBeenCalledOnce();
      const [year] = mockStorageService.saveYear.mock.calls[0];
      expect(year).toBe(CURRENT_YEAR);
    });

    it('calls storageService.saveYear with the updated state', () => {
      store.updateDay(1, 2, { score: -1, comment: 'bad day' });

      const [year, state] = mockStorageService.saveYear.mock.calls[0];
      expect(year).toBe(CURRENT_YEAR);
      expect(state.months[1].days[2].score).toBe(-1);
      expect(state.months[1].days[2].comment).toBe('bad day');
    });
  });

  describe('addField', () => {
    it('adds a new field and returns null on success', () => {
      const result = store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
      expect(result).toBeNull();
      expect(store.customFields().length).toBe(1);
      expect(store.customFields()[0].label).toBe('Notes');
    });

    it('returns an error string when a duplicate label is added', () => {
      store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
      const result = store.addField({ type: 'boolean', label: 'Notes', hidden: false, order: 1 });
      expect(result).toBeTypeOf('string');
      expect(store.customFields().length).toBe(1);
    });

    it('calls saveSettings after adding a field', () => {
      store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
      expect(mockStorageService.saveSettings).toHaveBeenCalledOnce();
    });
  });

  describe('updateField', () => {
    it('updates the hidden property of a field', () => {
      store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
      store.updateField('Notes', { hidden: true });
      expect(store.customFields()[0].hidden).toBe(true);
    });

    it('updates the order property of a field', () => {
      store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
      store.updateField('Notes', { order: 5 });
      expect(store.customFields()[0].order).toBe(5);
    });

    it('calls saveSettings after updating a field', () => {
      store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
      vi.clearAllMocks();
      store.updateField('Notes', { order: 1 });
      expect(mockStorageService.saveSettings).toHaveBeenCalledOnce();
    });
  });
});

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
    it('restores all day scores to 0 and comments to empty string', () => {
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
});

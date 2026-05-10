import { computed, inject } from '@angular/core';
import { signalStore, withMethods, withState, patchState, withComputed } from '@ngrx/signals';
import { DayState, Score, YearState } from '../models/app.model';
import { StorageService } from '../services/storage.service';

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function defaultYearState(): YearState {
  const year = new Date().getFullYear();
  return {
    months: Array.from({ length: 12 }, (_, monthIdx) => ({
      days: Array.from(
        { length: getDaysInMonth(year, monthIdx) },
        () => ({ score: 0 as Score, comment: '' })
      ),
    })),
  };
}

export const CalendarStore = signalStore(
  { providedIn: 'root' },
  withState<YearState>(defaultYearState),
  withComputed(({ months }) => ({
    monthStats: computed(() =>
      months().map(month => {
        const total = month.days.reduce((sum, day) => sum + day.score, 0);
        const average = month.days.length > 0 ? total / month.days.length : 0;
        return { total, average };
      })
    ),
  })),
  withMethods(store => {
    const storageService = inject(StorageService);
    const currentYear = new Date().getFullYear();
    return {
      updateDay(monthIdx: number, dayIdx: number, update: Partial<DayState>) {
        const months = store.months().map((month, mIdx) => {
          if (mIdx === monthIdx) {
            const days = month.days.map((day, dIdx) =>
              dIdx === dayIdx ? { ...day, ...update } : day
            );
            return { ...month, days };
          }
          return month;
        });
        patchState(store, { months });
        storageService.saveYear(currentYear, { months });
      },
      getDay(monthIdx: number, dayIdx: number) {
        return computed(() => store.months()[monthIdx].days[dayIdx]);
      },
      hydrate(state: YearState) {
        patchState(store, { months: state.months });
      },
      reset() {
        patchState(store, defaultYearState());
      },
    };
  })
);

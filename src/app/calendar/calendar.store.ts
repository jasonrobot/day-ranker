import { computed } from '@angular/core';
import { signalStore, withMethods, withState, patchState, withComputed } from '@ngrx/signals';
import { DayState, Score, YearState } from '../models/app.model';

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export const CalendarStore = signalStore(
  withState<YearState>(() => ({
    months: Array.from({ length: 12 }, (_, monthIdx) => ({
      days: Array.from(
        { length: getDaysInMonth(new Date().getFullYear(), monthIdx) },
        () => ({ score: 0 as Score, comment: '' })
      ),
    })),
  })),
  withComputed(({ months }) => ({
    monthStats: computed(() =>
      months().map(month => {
        const total = month.days.reduce((sum, day) => sum + day.score, 0);
        const average = month.days.length > 0 ? total / month.days.length : 0;
        return { total, average };
      })
    )
  })),
  withMethods(store => ({
    updateDay(monthIdx: number, dayIdx: number, update: Partial<DayState>) {
      const months = store.months().map((month, mIdx) => {
        if (mIdx === monthIdx) {
          const days = month.days.map((day, dIdx) => {
            if (dIdx === dayIdx) {
              return { ...day, ...update };
            }
            return day;
          });
          return { ...month, days };
        }
        return month;
      });
      patchState(store, { months });
    },
    getDay(monthIdx: number, dayIdx: number) {
      return computed(() => store.months()[monthIdx].days[dayIdx]);
    },
  }))
)

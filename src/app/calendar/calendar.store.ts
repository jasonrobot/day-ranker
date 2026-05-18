import { computed, inject } from '@angular/core';
import { signalStore, withMethods, withState, patchState, withComputed } from '@ngrx/signals';
import { AppSettings, DayState, FieldDefinition, YearState } from '../models/app.model';
import { StorageService } from '../services/storage.service';

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function defaultYearState(year: number): YearState {
  return {
    months: Array.from({ length: 12 }, (_, monthIdx) => ({
      days: Array.from(
        { length: getDaysInMonth(year, monthIdx) },
        () => ({ score: null, comment: '', customFields: {} })
      ),
    })),
  };
}

interface StoreState {
  years: Record<number, YearState>;
  currentYear: number;
  customFields: FieldDefinition[];
}

function defaultState(): StoreState {
  const year = new Date().getFullYear();
  return {
    years: { [year]: defaultYearState(year) },
    currentYear: year,
    customFields: [],
  };
}

export const CalendarStore = signalStore(
  { providedIn: 'root' },
  withState<StoreState>(defaultState()),
  withComputed(({ years, currentYear }) => {
    const months = computed(() => years()[currentYear()]?.months ?? defaultYearState(currentYear()).months);
    return {
      months,
      monthStats: computed(() =>
        months().map(month => {
          const scoredDays = month.days.filter(day => day.score !== null);
          const total = scoredDays.reduce((sum, day) => sum + day.score!, 0);
          const average = scoredDays.length > 0 ? total / scoredDays.length : 0;
          return { total, average };
        })
      ),
    };
  }),
  withMethods(store => {
    const storageService = inject(StorageService);

    storageService.loadSettings().then((settings: AppSettings) => {
      patchState(store, { customFields: settings.customFields });
    });

    return {
      updateDay(monthIdx: number, dayIdx: number, update: Partial<DayState>) {
        const year = store.currentYear();
        const months = store.months().map((month, mIdx) => {
          if (mIdx === monthIdx) {
            const days = month.days.map((day, dIdx) =>
              dIdx === dayIdx ? { ...day, ...update } : day
            );
            return { ...month, days };
          }
          return month;
        });
        const yearState = { months };
        patchState(store, { years: { ...store.years(), [year]: yearState } });
        storageService.saveYear(year, yearState);
      },
      getDay(monthIdx: number, dayIdx: number) {
        return computed(() => store.months()[monthIdx].days[dayIdx]);
      },
      async setYear(year: number): Promise<void> {
        patchState(store, {
          currentYear: year,
          years: store.years()[year]
            ? store.years()
            : { ...store.years(), [year]: defaultYearState(year) },
        });
        const state = await storageService.loadYear(year);
        if (state) {
          patchState(store, { years: { ...store.years(), [year]: state } });
        }
      },
      hydrate(year: number, state: YearState) {
        patchState(store, { years: { ...store.years(), [year]: state } });
      },
      reset() {
        patchState(store, defaultState());
      },
      addField(def: FieldDefinition): string | null {
        const exists = store.customFields().some(f => f.label === def.label);
        if (exists) {
          return `A field named "${def.label}" already exists.`;
        }
        const updated = [...store.customFields(), def];
        patchState(store, { customFields: updated });
        storageService.saveSettings({ customFields: updated });
        return null;
      },
      updateField(label: string, update: Partial<Omit<FieldDefinition, 'label' | 'type'>>) {
        const updated = store.customFields().map(f =>
          f.label === label ? { ...f, ...update } : f
        );
        patchState(store, { customFields: updated });
        storageService.saveSettings({ customFields: updated });
      },
    };
  })
);

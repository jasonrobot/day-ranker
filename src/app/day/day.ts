import { Component, computed, inject, input, OnDestroy } from "@angular/core";
import { CalendarStore } from "../calendar/calendar.store";
import { debounce } from "lodash";

export type Score = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export function isScore(value: number): value is Score {
  return value >= -3 && value <= 3;
}

@Component({
  selector: 'app-day',
  imports: [],
  templateUrl: './day.html',
  styleUrl: './day.scss',
})
export class Day implements OnDestroy {
  dayNumber = input<number>(1);
  monthIndex = input<number>(0);
  dayIndex = input<number>(0);

  // Inject the store directly
  calendarStore = inject(CalendarStore);

  // Get the month signal from the store
  monthSignal = computed(() => this.calendarStore.months()[this.monthIndex()]);

  // Get the day state by indexing into the days array
  dayState = computed(() => this.monthSignal().days[this.dayIndex()]);

  toNumber(value: string): number {
    return Number(value);
  }

  scoreClass = computed(() => {
    switch (this.dayState().score) {
      case 3: return 'score-plus3';
      case 2: return 'score-plus2';
      case 1: return 'score-plus1';
      case 0: return '';
      case -1: return 'score-minus1';
      case -2: return 'score-minus2';
      case -3: return 'score-minus3';
      default: return '';
    }
  });

  setScore(event: any) {
    const value = this.toNumber(event.target.value);
    if (isScore(value)) {
      this.calendarStore.updateDay(
        this.monthIndex(),
        this.dayIndex(),
        { score: value }
      );
    }
  }

  setComment = debounce((event: any) => {
    this.calendarStore.updateDay(
      this.monthIndex(),
      this.dayIndex(),
      { comment: event.target.value }
    );
  }, 1_000);

  ngOnDestroy(): void {
    this.setComment.flush();
  }
}

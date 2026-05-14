import { Component, computed, inject, input, OnDestroy } from "@angular/core";
import { CalendarStore } from "../calendar/calendar.store";
import { scoreClass as getScoreClass } from "../day/day";
import { debounce } from "lodash";

export type Score = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export function isScore(value: number): value is Score {
  return value >= -3 && value <= 3;
}


@Component({
  selector: 'app-day-editor',
  imports: [],
  templateUrl: './day-editor.html',
  styleUrl: './day-editor.scss',
})
export class DayEditor implements OnDestroy {
  dayNumber = input<number>(1);
  monthIndex = input<number>(0);
  dayIndex = input<number>(0);

  calendarStore = inject(CalendarStore);

  monthSignal = computed(() => this.calendarStore.months()[this.monthIndex()]);

  dayState = computed(() => this.monthSignal().days[this.dayIndex()]);

  toNumber(value: string): number {
    return Number(value);
  }

  scoreClass = computed(() => getScoreClass(this.dayState().score));

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

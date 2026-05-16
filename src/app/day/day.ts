import { Component, computed, inject, input, output } from "@angular/core";
import { CalendarStore } from "../calendar/calendar.store";

export function scoreClass(score: number | null): string {
  switch (score) {
    case 3: return 'score-plus3';
    case 2: return 'score-plus2';
    case 1: return 'score-plus1';
    case 0: return '';
    case -1: return 'score-minus1';
    case -2: return 'score-minus2';
    case -3: return 'score-minus3';
    default: return '';
  }
}

@Component({
  selector: 'app-day',
  imports: [],
  templateUrl: './day.html',
  styleUrl: './day.scss',
})
export class Day {
  dayNumber = input<number>(1);
  monthIndex = input<number>(0);
  dayIndex = input<number>(0);

  dayClick = output<{ monthIndex: number; dayIndex: number }>();

  calendarStore = inject(CalendarStore);

  monthSignal = computed(() => this.calendarStore.months()[this.monthIndex()]);
  dayState = computed(() => this.monthSignal().days[this.dayIndex()]);

  scoreClass = computed(() => scoreClass(this.dayState().score));

  onClick(): void {
    this.dayClick.emit({ monthIndex: this.monthIndex(), dayIndex: this.dayIndex() });
  }
}

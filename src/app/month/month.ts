import { Component, computed, inject, input } from '@angular/core';
import { Day } from '../day/day';
import { CalendarStore } from '../calendar/calendar.store';
import { CommonModule } from '@angular/common';

function* emptyDay() {
  let val = -1;
  while (true) {
    yield val;
    val -= 1;
  }
}

@Component({
  selector: 'app-month',
  imports: [
    CommonModule,
    Day,
  ],
  templateUrl: './month.html',
  styleUrls: ['./month.scss']
})
export class Month {
  monthName = input<string>('');
  monthIndex = input<number>(0); // 0-based (0 = January)
  year = input<number>(new Date().getFullYear());

  calendarStore = inject(CalendarStore);

  monthStats = computed(() => this.calendarStore.monthStats()[this.monthIndex()]);

  daysInMonth = computed(() => {
    const month = this.monthIndex();
    const year = this.year();
    return new Date(year, month + 1, 0).getDate();
  });

  startDayOfWeek = computed(() => {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return new Date(this.year(), this.monthIndex(), 1).getDay();
  });

  daysArray = computed(() =>
    Array.from({ length: this.daysInMonth() }, (_, i) => i + 1)
  );

  // Build weeks: each week is an array of 7, with empty slots as null
  weeks = computed(() => {
    const days = this.daysArray();
    // const startPad = Array(this.startDayOfWeek()).fill();
    const startPad = emptyDay().take(this.startDayOfWeek());
    const allDays: number[] = [...startPad, ...days];
    const weeks: number[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }
    return weeks;
  });
}

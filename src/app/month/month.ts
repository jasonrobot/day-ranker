import { Component, computed, input } from '@angular/core';
import { Day } from '../day/day';

@Component({
  selector: 'app-month',
  imports: [Day],
  templateUrl: './month.html',
  styleUrls: ['./month.scss']
})
export class Month {
  monthName = input<string>('');
  monthIndex = input<number>(0); // 0-based (0 = January)
  year = input<number>(new Date().getFullYear());

  // Compute the number of days in the month
  daysInMonth = computed(() => {
    const month = this.monthIndex();
    const year = this.year();
    return new Date(year, month + 1, 0).getDate();
  });

  // Create an array of day numbers [1, 2, ..., daysInMonth]
  daysArray = computed(() =>
    Array.from({ length: this.daysInMonth() }, (_, i) => i + 1)
  );
}

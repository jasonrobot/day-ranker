import { Component, input, output } from "@angular/core";

@Component({
  selector: 'app-day',
  imports: [],
  templateUrl: './day.html',
  styleUrl: './day.scss',
})
export class Day {
  score = input<number>(0); // Range: -3 to +3
  comment = input<string>(''); // Notes for the day
  dayNumber = input<number>(1); // 1-based day of the month

  scoreChange = output<number>();
  commentChange = output<string>();

  toNumber(value: string): number {
    return Number(value);
  }
}

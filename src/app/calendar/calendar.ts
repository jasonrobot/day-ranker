import { Component } from '@angular/core';
import { Month } from '../month/month';
import { CalendarStore } from './calendar.store';

@Component({
  selector: 'app-calendar',
  imports: [Month],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
  providers: [CalendarStore],
})
export class Calendar {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  currentYear = new Date().getFullYear();
}

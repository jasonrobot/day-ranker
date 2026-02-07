import { Component } from '@angular/core';
import { Month } from '../month/month';

@Component({
  selector: 'app-calendar',
  imports: [Month],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  currentYear = new Date().getFullYear();
}

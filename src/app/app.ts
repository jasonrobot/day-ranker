import { Component, signal } from "@angular/core";
import { Day } from "./day/day";
import { RouterOutlet } from "@angular/router";
import { Month } from "./month/month";
import { Calendar } from "./calendar/calendar";

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Calendar
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('day-ranker');
}

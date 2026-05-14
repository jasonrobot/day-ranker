import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { CalendarStore } from './calendar.store';
import { Month } from '../month/month';
import { CsvImportService } from '../services/csv-import.service';
import { StorageService } from '../services/storage.service';
import { DayPopup } from '../day-popup/day-popup';

@Component({
  selector: 'app-calendar',
  imports: [Month, DayPopup],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  currentYear = new Date().getFullYear();

  private readonly csvImport = inject(CsvImportService);
  private readonly storage = inject(StorageService);
  private readonly store = inject(CalendarStore);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly popup = viewChild(DayPopup);

  triggerImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  openPopup(): void {
    this.popup()?.open();
  }

  openDay(e: { monthIndex: number; dayIndex: number }): void {
    this.popup()?.open(e.monthIndex, e.dayIndex);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = this.csvImport.parse(text);
    if (!result) return;

    await this.storage.saveYear(result.year, result.state);
    this.store.hydrate(result.state);
    input.value = '';
  }
}

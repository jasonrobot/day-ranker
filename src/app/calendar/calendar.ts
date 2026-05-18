import { Component, ElementRef, inject, viewChild, DOCUMENT } from '@angular/core';
import { CalendarStore } from './calendar.store';
import { Month } from '../month/month';
import { CsvImportService } from '../services/csv-import.service';
import { StorageService } from '../services/storage.service';
import { DayPopup } from '../day-popup/day-popup';
import { SettingsDialog } from '../settings-dialog/settings-dialog';

@Component({
  selector: 'app-calendar',
  imports: [Month, DayPopup, SettingsDialog],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  private readonly csvImport = inject(CsvImportService);
  private readonly storage = inject(StorageService);
  private readonly document = inject(DOCUMENT);
  readonly store = inject(CalendarStore);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly popup = viewChild(DayPopup);
  readonly settingsDialog = viewChild(SettingsDialog);

  readonly currentYear = this.store.currentYear;

  triggerImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  openPopup(): void {
    const today = new Date();
    if (this.store.currentYear() !== today.getFullYear()) {
      this.store.setYear(today.getFullYear());
    }
    this.popup()?.open();
    setTimeout(() => {
      this.document.querySelector('.is-today')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  openDay(e: { monthIndex: number; dayIndex: number }): void {
    this.popup()?.open(e.monthIndex, e.dayIndex);
  }

  openSettings(): void {
    this.settingsDialog()?.open();
  }

  prevYear(): void {
    this.store.setYear(this.store.currentYear() - 1);
  }

  nextYear(): void {
    this.store.setYear(this.store.currentYear() + 1);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = this.csvImport.parse(text);
    if (!result) return;

    await this.storage.saveYear(result.year, result.state);
    this.store.hydrate(result.year, result.state);
    input.value = '';
  }
}

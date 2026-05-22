import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CalendarStore } from '../calendar/calendar.store';
import { DayEditor } from '../day-editor/day-editor';

@Component({
  selector: 'app-day-popup',
  imports: [DayEditor],
  templateUrl: './day-popup.html',
  styleUrl: './day-popup.scss',
})
export class DayPopup {
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly editorRef = viewChild(DayEditor);
  private readonly store = inject(CalendarStore);

  monthIndex = signal<number>(0);
  dayIndex = signal<number>(0);
  isDirty = signal(false);

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  monthName = computed(() => this.monthNames[this.monthIndex()]);
  dayNumber = computed(() => this.dayIndex() + 1);

  canGoPrev = computed(() => !(this.monthIndex() === 0 && this.dayIndex() === 0));

  canGoNext = computed(() => {
    const daysInMonth = this.store.months()[this.monthIndex()]?.days.length ?? 0;
    return !(this.monthIndex() === 11 && this.dayIndex() === daysInMonth - 1);
  });

  open(monthIndex?: number, dayIndex?: number): void {
    this.isDirty.set(false);
    if (monthIndex !== undefined && dayIndex !== undefined) {
      this.monthIndex.set(monthIndex);
      this.dayIndex.set(dayIndex);
    } else {
      const today = new Date();
      this.monthIndex.set(today.getMonth());
      this.dayIndex.set(today.getDate() - 1);
    }
    this.dialogRef()?.nativeElement.showModal();
    this.editorRef()?.focusComment()
  }

  close(): void {
    this.dialogRef()?.nativeElement.close();
  }

  save(): void {
    this.editorRef()?.save();
  }

  onDirtyChange(dirty: boolean): void {
    this.isDirty.set(dirty);
  }

  prev(): void {
    if (!this.canGoPrev()) return;
    if (this.dayIndex() === 0) {
      const newMonth = this.monthIndex() - 1;
      const daysInPrevMonth = this.store.months()[newMonth]?.days.length ?? 0;
      this.monthIndex.set(newMonth);
      this.dayIndex.set(daysInPrevMonth - 1);
    } else {
      this.dayIndex.set(this.dayIndex() - 1);
    }
  }

  next(): void {
    if (!this.canGoNext()) return;
    const daysInMonth = this.store.months()[this.monthIndex()]?.days.length ?? 0;
    if (this.dayIndex() === daysInMonth - 1) {
      this.monthIndex.set(this.monthIndex() + 1);
      this.dayIndex.set(0);
    } else {
      this.dayIndex.set(this.dayIndex() + 1);
    }
  }
}

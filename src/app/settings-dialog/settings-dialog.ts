import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarStore } from '../calendar/calendar.store';
import { FieldDefinition, FieldType, isNumberField } from '../models/app.model';

@Component({
  selector: 'app-settings-dialog',
  imports: [FormsModule],
  templateUrl: './settings-dialog.html',
  styleUrl: './settings-dialog.scss',
})
export class SettingsDialog {
  readonly calendarStore = inject(CalendarStore);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  readonly sortedFields = computed(() =>
    [...this.calendarStore.customFields()].sort((a, b) => a.order - b.order)
  );

  readonly addError = signal<string | null>(null);

  newLabel = '';
  newType: FieldType = 'text';
  newRangeMin = 0;
  newRangeMax = 10;
  newOrder = 0;

  readonly isNumberField = isNumberField;

  open(): void {
    this.dialogRef()?.nativeElement.showModal();
  }

  close(): void {
    this.dialogRef()?.nativeElement.close();
  }

  submitAddField(): void {
    const def = this.buildFieldDef();
    const error = this.calendarStore.addField(def);
    if (error) {
      this.addError.set(error);
      return;
    }
    this.addError.set(null);
    this.resetForm();
  }

  updateOrder(label: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.calendarStore.updateField(label, { order: value });
  }

  updateHidden(label: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.calendarStore.updateField(label, { hidden: value });
  }

  private buildFieldDef(): FieldDefinition {
    const base = { label: this.newLabel, hidden: false, order: this.newOrder };
    if (this.newType === 'number') {
      return { ...base, type: 'number', range: [this.newRangeMin, this.newRangeMax] as [number, number] };
    }
    if (this.newType === 'boolean') {
      return { ...base, type: 'boolean' };
    }
    return { ...base, type: 'text' };
  }

  private resetForm(): void {
    this.newLabel = '';
    this.newType = 'text';
    this.newRangeMin = 0;
    this.newRangeMax = 10;
    this.newOrder = 0;
  }
}

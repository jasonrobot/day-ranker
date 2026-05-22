import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CalendarStore } from '../calendar/calendar.store';
import { isBooleanField, isNumberField, isTextField, Score, isScore } from '../models/app.model';
import { scoreClass as getScoreClass } from '../day/day';

@Component({
  selector: 'app-day-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './day-editor.html',
  styleUrl: './day-editor.scss',
})
export class DayEditor {
  dayNumber = input<number>(1);
  monthIndex = input<number>(0);
  dayIndex = input<number>(0);

  saved = output<void>();
  dirtyChange = output<boolean>();

  commentInput = viewChild<ElementRef<HTMLTextAreaElement>>('commentInput');

  readonly calendarStore = inject(CalendarStore);
  private readonly fb = inject(FormBuilder);

  readonly isTextField = isTextField;
  readonly isBooleanField = isBooleanField;
  readonly isNumberField = isNumberField;

  readonly dayState = computed(() =>
    this.calendarStore.months()[this.monthIndex()]?.days[this.dayIndex()] ?? { score: null, comment: '' }
  );
  readonly scoreClass = computed(() => getScoreClass(this.dayState().score));

  readonly visibleFields = computed(() =>
    this.calendarStore.customFields()
      .filter(f => !f.hidden)
      .sort((a, b) => a.order - b.order)
  );

  readonly customFieldValues = signal<Record<string, string | boolean | number>>({});

  readonly form = this.fb.group({
    score: [0],
    comment: [''],
  });

  constructor() {
    effect(() => {
      const day = this.dayState();
      this.form.setValue(
        { score: day.score ?? 0, comment: day.comment },
        { emitEvent: false }
      );

      const existing = day.customFields ?? {};
      const vals: Record<string, string | boolean | number> = { ...existing };
      for (const field of this.visibleFields()) {
        if (!(field.label in vals)) {
          if (isTextField(field)) {
            vals[field.label] = '';
          } else if (isBooleanField(field)) {
            vals[field.label] = false;
          } else if (isNumberField(field)) {
            vals[field.label] = field.range[0];
          }
        }
      }
      this.customFieldValues.set(vals);

      this.form.markAsPristine();
      this.dirtyChange.emit(false);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dirtyChange.emit(this.form.dirty);
    });
  }

  focusComment() {
    this.commentInput()?.nativeElement.focus();
  }

  onCustomFieldChange(label: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const field = this.calendarStore.customFields().find(f => f.label === label);
    if (!field) return;

    let value: string | boolean | number;
    if (isBooleanField(field)) {
      value = input.checked;
    } else if (isNumberField(field)) {
      value = Number(input.value);
    } else {
      value = input.value;
    }

    this.customFieldValues.update(vals => ({ ...vals, [label]: value }));
    this.dirtyChange.emit(true);
  }

  save(): void {
    const score = this.form.value.score ?? 0;
    const comment = this.form.value.comment ?? '';
    if (!isScore(score)) return;
    this.calendarStore.updateDay(this.monthIndex(), this.dayIndex(), {
      score: score as Score,
      comment,
      customFields: this.customFieldValues(),
    });
    this.saved.emit();
  }
}

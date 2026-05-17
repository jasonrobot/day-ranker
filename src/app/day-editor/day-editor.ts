import { Component, computed, effect, inject, input, output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CalendarStore } from "../calendar/calendar.store";
import { Score, isScore } from "../models/app.model";
import { scoreClass as getScoreClass } from "../day/day";

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

  readonly calendarStore = inject(CalendarStore);
  private readonly fb = inject(FormBuilder);

  readonly dayState = computed(() =>
    this.calendarStore.months()[this.monthIndex()].days[this.dayIndex()]
  );
  readonly scoreClass = computed(() => getScoreClass(this.dayState().score));

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
      this.form.markAsPristine();
      this.dirtyChange.emit(false);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dirtyChange.emit(this.form.dirty);
    });
  }

  save(): void {
    const score = this.form.value.score ?? 0;
    const comment = this.form.value.comment ?? '';
    if (!isScore(score)) return;
    this.calendarStore.updateDay(this.monthIndex(), this.dayIndex(), {
      score: score as Score,
      comment,
    });
    this.saved.emit();
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DayEditor } from './day-editor';
import { CalendarStore } from '../calendar/calendar.store';
import { StorageService } from '../services/storage.service';

describe('DayEditor', () => {
  let component: DayEditor;
  let fixture: ComponentFixture<DayEditor>;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DayEditor],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DayEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes form with score 0 when day score is null', () => {
    expect(component.form.value).toEqual({ score: 0, comment: '' });
  });

  it('initializes form from stored day values when store updates', () => {
    component.calendarStore.updateDay(0, 0, { score: 2, comment: 'great day' });
    fixture.detectChanges();
    expect(component.form.value).toEqual({ score: 2, comment: 'great day' });
  });

  it('emits dirtyChange(true) when form is dirtied and value changes', () => {
    const emitted: boolean[] = [];
    component.dirtyChange.subscribe((v: boolean) => emitted.push(v));
    component.form.markAsDirty();
    component.form.patchValue({ score: 1 });
    expect(emitted).toContain(true);
  });

  it('save() calls calendarStore.updateDay with form values', () => {
    const updateSpy = vi.spyOn(component.calendarStore, 'updateDay');
    component.form.setValue({ score: 2, comment: 'nice' });
    component.save();
    expect(updateSpy).toHaveBeenCalledWith(0, 0, { score: 2, comment: 'nice' });
  });

  it('save() emits closed', () => {
    let emitted = false;
    component.closed.subscribe(() => { emitted = true; });
    component.save();
    expect(emitted).toBe(true);
  });

  it('cancel() emits closed without saving', () => {
    const updateSpy = vi.spyOn(component.calendarStore, 'updateDay');
    let emitted = false;
    component.closed.subscribe(() => { emitted = true; });
    component.cancel();
    expect(emitted).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('save() does NOT emit closed when score is out of range', () => {
    let emitted = false;
    component.closed.subscribe(() => { emitted = true; });
    component.form.patchValue({ score: 5 });
    component.save();
    expect(emitted).toBe(false);
  });

  it('effect emits dirtyChange(false) when day state changes', () => {
    const emitted: boolean[] = [];
    component.dirtyChange.subscribe((v: boolean) => emitted.push(v));
    component.calendarStore.updateDay(0, 0, { score: 1, comment: 'test' });
    fixture.detectChanges();
    expect(emitted).toContain(false);
  });

  it('scoreClass reflects stored score', () => {
    expect(component.scoreClass()).toBe('score-unset');
    component.calendarStore.updateDay(0, 0, { score: 3 });
    expect(component.scoreClass()).toBe('score-plus3');
  });
});

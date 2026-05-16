import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DayEditor } from '../day-editor/day-editor';
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
    await TestBed.configureTestingModule({
      imports: [DayEditor],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DayEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default inputs', () => {
    expect(component.dayNumber()).toBe(1);
    expect(component.monthIndex()).toBe(0);
    expect(component.dayIndex()).toBe(0);
  });

  it('should have dayState with default score of null', () => {
    expect(component.dayState().score).toBeNull();
    expect(component.dayState().comment).toBe('');
  });

  it('should return score-unset scoreClass for null score', () => {
    expect(component.scoreClass()).toBe('score-unset');
  });

  it('should return correct scoreClass for positive scores', () => {
    component.calendarStore.updateDay(0, 0, { score: 1 });
    expect(component.scoreClass()).toBe('score-plus1');

    component.calendarStore.updateDay(0, 0, { score: 2 });
    expect(component.scoreClass()).toBe('score-plus2');

    component.calendarStore.updateDay(0, 0, { score: 3 });
    expect(component.scoreClass()).toBe('score-plus3');
  });

  it('should return correct scoreClass for negative scores', () => {
    component.calendarStore.updateDay(0, 0, { score: -1 });
    expect(component.scoreClass()).toBe('score-minus1');

    component.calendarStore.updateDay(0, 0, { score: -2 });
    expect(component.scoreClass()).toBe('score-minus2');

    component.calendarStore.updateDay(0, 0, { score: -3 });
    expect(component.scoreClass()).toBe('score-minus3');
  });

  it('should update day score via setScore', () => {
    component.setScore({ target: { value: '2' } });
    expect(component.dayState().score).toBe(2);
  });

  it('should update day comment via setComment', () => {
    component.setComment({ target: { value: 'Test comment' } });
    component.setComment.flush();
    expect(component.dayState().comment).toBe('Test comment');
  });

  it('should not update score if value is out of range', () => {
    component.setScore({ target: { value: '5' } });
    expect(component.dayState().score).toBeNull();
  });

  it('should flush setComment debounce on destroy', () => {
    const flushSpy = vi.spyOn(component.setComment, 'flush');
    component.ngOnDestroy();
    expect(flushSpy).toHaveBeenCalled();
  });
});

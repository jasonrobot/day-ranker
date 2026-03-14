import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Day } from './day';
import { CalendarStore } from '../calendar/calendar.store';

describe('Day', () => {
  let component: Day;
  let fixture: ComponentFixture<Day>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Day],
      providers: [CalendarStore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Day);
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

  it('should have dayState with default score of 0', () => {
    const dayState = component.dayState();
    expect(dayState.score).toBe(0);
    expect(dayState.comment).toBe('');
  });

  it('should return correct scoreClass for score 0', () => {
    expect(component.scoreClass()).toBe('');
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
    const mockEvent = { target: { value: '2' } };
    component.setScore(mockEvent);
    expect(component.dayState().score).toBe(2);
  });

  it('should update day comment via setComment', () => {
    const mockEvent = { target: { value: 'Test comment' } };
    component.setComment(mockEvent);
    expect(component.dayState().comment).toBe('Test comment');
  });

  it('should not update score if value is out of range', () => {
    const mockEvent = { target: { value: '5' } };
    component.setScore(mockEvent);
    expect(component.dayState().score).toBe(0);
  });
});

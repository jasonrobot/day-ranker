import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DayPopup } from './day-popup';
import { CalendarStore } from '../calendar/calendar.store';
import { StorageService } from '../services/storage.service';

describe('DayPopup', () => {
  let component: DayPopup;
  let fixture: ComponentFixture<DayPopup>;
  let dialogEl: HTMLDialogElement;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue({ customFields: [] }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayPopup],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DayPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    dialogEl = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialogEl.showModal = vi.fn();
    dialogEl.close = vi.fn();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('open() sets monthIndex and dayIndex to today', () => {
    const today = new Date();
    component.open();
    expect(component.monthIndex()).toBe(today.getMonth());
    expect(component.dayIndex()).toBe(today.getDate() - 1);
  });

  it('open(monthIndex, dayIndex) sets specific day', () => {
    component.open(3, 14);
    expect(component.monthIndex()).toBe(3);
    expect(component.dayIndex()).toBe(14);
  });

  it('open() calls showModal', () => {
    component.open();
    expect(dialogEl.showModal).toHaveBeenCalled();
  });

  it('close() calls dialog.close()', () => {
    component.close();
    expect(dialogEl.close).toHaveBeenCalled();
  });

  it('canGoPrev is false on Jan 1', () => {
    component.monthIndex.set(0);
    component.dayIndex.set(0);
    expect(component.canGoPrev()).toBe(false);
  });

  it('canGoPrev is true on Jan 2', () => {
    component.monthIndex.set(0);
    component.dayIndex.set(1);
    expect(component.canGoPrev()).toBe(true);
  });

  it('canGoPrev is true on Feb 1', () => {
    component.monthIndex.set(1);
    component.dayIndex.set(0);
    expect(component.canGoPrev()).toBe(true);
  });

  it('canGoNext is false on Dec 31', () => {
    component.monthIndex.set(11);
    component.dayIndex.set(30);
    expect(component.canGoNext()).toBe(false);
  });

  it('canGoNext is true on Dec 30', () => {
    component.monthIndex.set(11);
    component.dayIndex.set(29);
    expect(component.canGoNext()).toBe(true);
  });

  it('canGoNext is true on Nov 30', () => {
    component.monthIndex.set(10);
    component.dayIndex.set(29);
    expect(component.canGoNext()).toBe(true);
  });

  it('prev() decrements dayIndex', () => {
    component.monthIndex.set(0);
    component.dayIndex.set(5);
    component.prev();
    expect(component.monthIndex()).toBe(0);
    expect(component.dayIndex()).toBe(4);
  });

  it('prev() wraps to last day of previous month', () => {
    component.monthIndex.set(1);
    component.dayIndex.set(0);
    component.prev();
    expect(component.monthIndex()).toBe(0);
    expect(component.dayIndex()).toBe(30);
  });

  it('prev() does nothing on Jan 1', () => {
    component.monthIndex.set(0);
    component.dayIndex.set(0);
    component.prev();
    expect(component.monthIndex()).toBe(0);
    expect(component.dayIndex()).toBe(0);
  });

  it('next() increments dayIndex', () => {
    component.monthIndex.set(0);
    component.dayIndex.set(0);
    component.next();
    expect(component.monthIndex()).toBe(0);
    expect(component.dayIndex()).toBe(1);
  });

  it('next() wraps to first day of next month', () => {
    component.monthIndex.set(0);
    component.dayIndex.set(30);
    component.next();
    expect(component.monthIndex()).toBe(1);
    expect(component.dayIndex()).toBe(0);
  });

  it('next() does nothing on Dec 31', () => {
    component.monthIndex.set(11);
    component.dayIndex.set(30);
    component.next();
    expect(component.monthIndex()).toBe(11);
    expect(component.dayIndex()).toBe(30);
  });

  it('monthName reflects current monthIndex', () => {
    component.monthIndex.set(4);
    expect(component.monthName()).toBe('May');
  });

  it('dayNumber is dayIndex + 1', () => {
    component.dayIndex.set(13);
    expect(component.dayNumber()).toBe(14);
  });

  it('close() calls dialog close', () => {
    component.open(0, 0);
    component.close();
    expect(dialogEl.close).toHaveBeenCalled();
  });

  it('onDirtyChange(true) sets isDirty to true', () => {
    component.onDirtyChange(true);
    expect(component.isDirty()).toBe(true);
  });

  it('onDirtyChange(false) sets isDirty to false', () => {
    component.isDirty.set(true);
    component.onDirtyChange(false);
    expect(component.isDirty()).toBe(false);
  });

  it('open() resets isDirty to false', () => {
    component.isDirty.set(true);
    component.open(0, 0);
    expect(component.isDirty()).toBe(false);
  });

  it('hides nav buttons when isDirty is true', async () => {
    component.open(0, 0);
    fixture.detectChanges();
    await fixture.whenStable();
    component.onDirtyChange(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const navBtns = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navBtns[0].style.visibility).toBe('hidden');
    expect(navBtns[1].style.visibility).toBe('hidden');
  });

  it('shows nav buttons when isDirty is false', async () => {
    component.open(0, 5);
    component.onDirtyChange(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const navBtns = fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(navBtns.length).toBe(2);
  });
});

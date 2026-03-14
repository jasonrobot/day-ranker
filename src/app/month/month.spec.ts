import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Month } from './month';
import { CalendarStore } from '../calendar/calendar.store';

describe('Month', () => {
  let component: Month;
  let fixture: ComponentFixture<Month>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Month],
      providers: [CalendarStore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Month);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

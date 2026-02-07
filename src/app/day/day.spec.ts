import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Day } from './day';

describe('Day', () => {
  let component: Day;
  let fixture: ComponentFixture<Day>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Day]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Day);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

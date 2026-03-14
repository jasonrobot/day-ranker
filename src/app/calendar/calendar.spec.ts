import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Calendar } from './calendar';
import { Month } from '../month/month';

describe('Calendar', () => {
  let component: Calendar;
  let fixture: ComponentFixture<Calendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Calendar, Month]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Calendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 12 months', () => {
    expect(component.months).toHaveLength(12);
  });

  it('should have correct month names', () => {
    const expectedMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    expect(component.months).toEqual(expectedMonths);
  });

  it('should set currentYear to the current year', () => {
    const currentYear = new Date().getFullYear();
    expect(component.currentYear).toBe(currentYear);
  });

  it('should render calendar container', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.calendar-container')).toBeTruthy();
  });

  it('should display the current year in the heading', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h2') as HTMLElement;
    expect(heading.textContent).toContain(`Year: ${component.currentYear}`);
  });

  it('should render 12 month components', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const monthComponents = compiled.querySelectorAll('app-month');
    expect(monthComponents).toHaveLength(12);
  });
});

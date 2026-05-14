import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Calendar } from './calendar';
import { Month } from '../month/month';
import { CalendarStore } from './calendar.store';
import { StorageService } from '../services/storage.service';
import { CsvImportService } from '../services/csv-import.service';
import { DayPopup } from '../day-popup/day-popup';

describe('Calendar', () => {
  let component: Calendar;
  let fixture: ComponentFixture<Calendar>;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  const mockCsvImportService = {
    parse: vi.fn(),
  };

  beforeEach(async () => {
    mockCsvImportService.parse.mockReset();
    mockStorageService.saveYear.mockReset();

    await TestBed.configureTestingModule({
      imports: [Calendar, Month, DayPopup],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
        { provide: CsvImportService, useValue: mockCsvImportService },
      ],
    }).compileComponents();

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
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    expect(component.months).toEqual(expectedMonths);
  });

  it('should set currentYear to the current year', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('should render calendar container', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.calendar-container')).toBeTruthy();
  });

  it('should display the current year in the heading', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const heading = el.querySelector('h2') as HTMLElement;
    expect(heading.textContent).toContain(`Year: ${component.currentYear}`);
  });

  it('should render 12 month components', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-month')).toHaveLength(12);
  });

  it('renders the Import CSV button', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('.calendar-header button');
    const labels = Array.from(buttons).map(b => b.textContent?.trim());
    expect(labels).toContain('Import CSV');
  });

  it('renders a "Today" button in the header', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('.calendar-header button');
    const labels = Array.from(buttons).map(b => b.textContent?.trim());
    expect(labels).toContain('Today');
  });

  it('renders the day-popup component', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-day-popup')).toBeTruthy();
  });

  it('openPopup() calls popup.open()', () => {
    fixture.detectChanges();
    const openSpy = vi.spyOn(component.popup()!, 'open').mockImplementation(() => {});
    component.openPopup();
    expect(openSpy).toHaveBeenCalled();
  });

  it('onFileSelected does nothing when parse returns null', async () => {
    mockCsvImportService.parse.mockReturnValue(null);
    const mockFile = { text: vi.fn().mockResolvedValue('bad data') } as unknown as File;
    const mockEvent = {
      target: { files: [mockFile], value: '' },
    } as unknown as Event;

    await component.onFileSelected(mockEvent);

    expect(mockStorageService.saveYear).not.toHaveBeenCalled();
  });

  it('onFileSelected saves and hydrates when parse returns a valid result', async () => {
    const fakeState = { months: [] } as any;
    mockCsvImportService.parse.mockReturnValue({ year: 2025, state: fakeState });
    const mockFile = { text: vi.fn().mockResolvedValue('2025-01-01,1,test') } as unknown as File;
    const mockEvent = {
      target: { files: [mockFile], value: '' },
    } as unknown as Event;

    await component.onFileSelected(mockEvent);

    expect(mockStorageService.saveYear).toHaveBeenCalledWith(2025, fakeState);
  });
});

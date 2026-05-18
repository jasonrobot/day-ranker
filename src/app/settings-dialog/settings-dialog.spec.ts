import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SettingsDialog } from './settings-dialog';
import { CalendarStore } from '../calendar/calendar.store';
import { StorageService } from '../services/storage.service';

describe('SettingsDialog', () => {
  let component: SettingsDialog;
  let fixture: ComponentFixture<SettingsDialog>;
  let store: InstanceType<typeof CalendarStore>;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue({ customFields: [] }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [SettingsDialog],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    store = TestBed.inject(CalendarStore);
    fixture = TestBed.createComponent(SettingsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows an inline error when adding a field with a duplicate label', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    fixture.detectChanges();

    component.newLabel = 'Notes';
    component.newType = 'text';
    component.newOrder = 1;
    component.submitAddField();
    fixture.detectChanges();

    expect(component.addError()).toContain('Notes');
    const errorEl = fixture.nativeElement.querySelector('.add-error');
    expect(errorEl).toBeTruthy();
  });

  it('shows an error when submitting with an empty label', () => {
    component.newLabel = '';
    component.submitAddField();
    fixture.detectChanges();

    expect(component.addError()).toBe('Label is required.');
    const errorEl = fixture.nativeElement.querySelector('.add-error');
    expect(errorEl).toBeTruthy();
  });

  it('clears the error and resets the form on successful add', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    component.newLabel = 'Notes';
    component.submitAddField();
    fixture.detectChanges();

    component.newLabel = 'Energy';
    component.newType = 'number';
    component.newRangeMin = 1;
    component.newRangeMax = 10;
    component.newOrder = 1;
    component.submitAddField();
    fixture.detectChanges();

    expect(component.addError()).toBeNull();
    expect(component.newLabel).toBe('');
  });
});

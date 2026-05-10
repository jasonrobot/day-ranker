import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { CalendarStore } from '../calendar/calendar.store';
import { SyncService } from './sync.service';
import { YearState } from '../models/app.model';

const CURRENT_YEAR = new Date().getFullYear();

const mockYearState: YearState = {
  months: Array.from({ length: 12 }, () => ({
    days: [{ score: 1, comment: 'loaded' }],
  })),
};

describe('SyncService', () => {
  let service: SyncService;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  const mockCalendarStore = {
    hydrate: vi.fn(),
    reset: vi.fn(),
  };

  const mockAuthService = {
    user: vi.fn().mockReturnValue(null),
  };

  beforeEach(() => {
    mockStorageService.loadYear.mockResolvedValue(null);

    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: CalendarStore, useValue: mockCalendarStore },
      ],
    });

    service = TestBed.inject(SyncService);
    // Clear calls that happened in the constructor (effect fires with null user → onLogout)
    vi.clearAllMocks();
    mockStorageService.loadYear.mockResolvedValue(null);
  });

  it('calls storageService.loadYear with current year on onLogin', async () => {
    await service.onLogin();
    expect(mockStorageService.loadYear).toHaveBeenCalledWith(CURRENT_YEAR);
  });

  it('calls calendarStore.hydrate when loadYear returns data', async () => {
    mockStorageService.loadYear.mockResolvedValue(mockYearState);
    await service.onLogin();
    expect(mockCalendarStore.hydrate).toHaveBeenCalledWith(mockYearState);
  });

  it('does not call calendarStore.hydrate when loadYear returns null', async () => {
    await service.onLogin();
    expect(mockCalendarStore.hydrate).not.toHaveBeenCalled();
  });

  it('calls calendarStore.reset on onLogout', () => {
    service.onLogout();
    expect(mockCalendarStore.reset).toHaveBeenCalledOnce();
  });
});

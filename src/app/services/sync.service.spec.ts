import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { CalendarStore } from '../calendar/calendar.store';
import { SyncService } from './sync.service';

const CURRENT_YEAR = new Date().getFullYear();

describe('SyncService', () => {
  let service: SyncService;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  const mockCalendarStore = {
    setYear: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  };

  const mockAuthService = {
    user: vi.fn().mockReturnValue(null),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: CalendarStore, useValue: mockCalendarStore },
      ],
    });

    service = TestBed.inject(SyncService);
    vi.clearAllMocks();
    mockCalendarStore.setYear.mockResolvedValue(undefined);
  });

  it('calls calendarStore.setYear with current year on onLogin', async () => {
    mockAuthService.user.mockReturnValue({ uid: 'user1' });
    await service.onLogin();
    expect(mockCalendarStore.setYear).toHaveBeenCalledWith(CURRENT_YEAR);
  });

  it('does not call setYear again if onLogin fires with the same uid', async () => {
    mockAuthService.user.mockReturnValue({ uid: 'user1' });
    await service.onLogin();
    await service.onLogin();
    expect(mockCalendarStore.setYear).toHaveBeenCalledOnce();
  });

  it('calls setYear again after logout and re-login with same uid', async () => {
    mockAuthService.user.mockReturnValue({ uid: 'user1' });
    await service.onLogin();
    service.onLogout();
    await service.onLogin();
    expect(mockCalendarStore.setYear).toHaveBeenCalledTimes(2);
  });

  it('calls calendarStore.reset on onLogout', () => {
    service.onLogout();
    expect(mockCalendarStore.reset).toHaveBeenCalledOnce();
  });
});

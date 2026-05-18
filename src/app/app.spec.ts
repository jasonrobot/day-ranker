import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { App } from './app';
import { AuthService } from './services/auth.service';
import { SyncService } from './services/sync.service';
import { CalendarStore } from './calendar/calendar.store';
import { StorageService } from './services/storage.service';

describe('App', () => {
  const mockUserSignal = signal<{ uid: string } | null>(null);

  const mockAuthService = {
    user: mockUserSignal.asReadonly(),
    signInError: signal<string | null>(null).asReadonly(),
  };

  const mockSyncService = {};

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue({ customFields: [] }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        CalendarStore,
        { provide: AuthService, useValue: mockAuthService },
        { provide: SyncService, useValue: mockSyncService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('shows login when user is not authenticated', () => {
    mockUserSignal.set(null);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-login')).toBeTruthy();
    expect(el.querySelector('app-calendar')).toBeFalsy();
  });

  it('shows calendar when user is authenticated', () => {
    mockUserSignal.set({ uid: 'user123' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-calendar')).toBeTruthy();
    expect(el.querySelector('app-login')).toBeFalsy();
  });
});

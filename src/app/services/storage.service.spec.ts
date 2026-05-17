import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { FIREBASE_FIRESTORE } from '../firebase';
import { AuthService } from './auth.service';
import { AppSettings, YearState } from '../models/app.model';

const { mockGetDoc, mockSetDoc, mockDoc } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockDoc: vi.fn().mockReturnValue('mock-doc-ref'),
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
}));

import { StorageService } from './storage.service';

const CURRENT_YEAR = new Date().getFullYear();

const mockYearState: YearState = {
  months: Array.from({ length: 12 }, () => ({
    days: [{ score: 1, comment: 'test' }],
  })),
};

const fakeStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => fakeStorage[key] ?? null,
  setItem: (key: string, value: string) => { fakeStorage[key] = value; },
  removeItem: (key: string) => { delete fakeStorage[key]; },
  clear: () => { Object.keys(fakeStorage).forEach(k => delete fakeStorage[k]); },
};

vi.stubGlobal('localStorage', mockLocalStorage);

describe('StorageService', () => {
  let service: StorageService;
  const mockUserSignal = signal<{ uid: string } | null>({ uid: 'user123' });

  const mockAuthService = {
    user: mockUserSignal.asReadonly(),
  };

  beforeEach(() => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);
    mockLocalStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: FIREBASE_FIRESTORE, useValue: {} },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadYear', () => {
    it('returns null when no data exists in Firestore or localStorage', async () => {
      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toBeNull();
    });

    it('returns data from Firestore when available', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockYearState,
      });

      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toEqual(mockYearState);
    });

    it('falls back to localStorage when Firestore throws', async () => {
      mockGetDoc.mockRejectedValue(new Error('network error'));
      localStorage.setItem(`day-ranker:user123:${CURRENT_YEAR}`, JSON.stringify(mockYearState));

      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toEqual(mockYearState);
    });

    it('returns null when Firestore throws and localStorage is empty', async () => {
      mockGetDoc.mockRejectedValue(new Error('network error'));

      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toBeNull();
    });

    it('returns null when user is not logged in', async () => {
      mockUserSignal.set(null);
      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toBeNull();
      mockUserSignal.set({ uid: 'user123' });
    });
  });

  describe('loadSettings', () => {
    it('returns default settings when no data exists in Firestore or localStorage', async () => {
      const result = await service.loadSettings();
      expect(result).toEqual({ customFields: [] });
    });

    it('returns data from Firestore when available', async () => {
      const mockSettings: AppSettings = { customFields: [{ type: 'text', label: 'Notes', hidden: false, order: 0 }] };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSettings,
      });

      const result = await service.loadSettings();
      expect(result).toEqual(mockSettings);
    });

    it('falls back to localStorage when Firestore throws', async () => {
      const mockSettings: AppSettings = { customFields: [{ type: 'boolean', label: 'Good', hidden: false, order: 0 }] };
      mockGetDoc.mockRejectedValue(new Error('network error'));
      localStorage.setItem('day-ranker:user123:settings', JSON.stringify(mockSettings));

      const result = await service.loadSettings();
      expect(result).toEqual(mockSettings);
    });

    it('returns default settings when Firestore throws and localStorage is empty', async () => {
      mockGetDoc.mockRejectedValue(new Error('network error'));

      const result = await service.loadSettings();
      expect(result).toEqual({ customFields: [] });
    });

    it('returns default settings when user is not logged in', async () => {
      mockUserSignal.set(null);
      const result = await service.loadSettings();
      expect(result).toEqual({ customFields: [] });
      mockUserSignal.set({ uid: 'user123' });
    });
  });

  describe('saveSettings', () => {
    const mockSettings: AppSettings = { customFields: [{ type: 'text', label: 'Notes', hidden: false, order: 0 }] };

    it('writes to localStorage synchronously with the correct key', async () => {
      await service.saveSettings(mockSettings);

      const stored = localStorage.getItem('day-ranker:user123:settings');
      expect(JSON.parse(stored!)).toEqual(mockSettings);
    });

    it('calls setDoc with the correct Firestore path', async () => {
      await service.saveSettings(mockSettings);

      expect(mockDoc).toHaveBeenCalledWith({}, 'users/user123/settings/data');
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', mockSettings);
    });

    it('does nothing when user is not logged in', async () => {
      mockUserSignal.set(null);
      await service.saveSettings(mockSettings);
      expect(mockSetDoc).not.toHaveBeenCalled();
      mockUserSignal.set({ uid: 'user123' });
    });
  });

  describe('saveYear', () => {
    it('writes to localStorage synchronously with the correct key', async () => {
      await service.saveYear(CURRENT_YEAR, mockYearState);

      const stored = localStorage.getItem(`day-ranker:user123:${CURRENT_YEAR}`);
      expect(JSON.parse(stored!)).toEqual(mockYearState);
    });

    it('calls setDoc with the correct Firestore path', async () => {
      await service.saveYear(CURRENT_YEAR, mockYearState);

      expect(mockDoc).toHaveBeenCalledWith({}, `users/user123/years/${CURRENT_YEAR}`);
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', mockYearState);
    });

    it('does nothing when user is not logged in', async () => {
      mockUserSignal.set(null);
      await service.saveYear(CURRENT_YEAR, mockYearState);
      expect(mockSetDoc).not.toHaveBeenCalled();
      mockUserSignal.set({ uid: 'user123' });
    });
  });
});

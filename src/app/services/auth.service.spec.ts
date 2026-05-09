import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FIREBASE_AUTH } from '../firebase';

const { mockOnAuthStateChanged, mockSignInWithPopup, mockSignOut } = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signInWithPopup: mockSignInWithPopup,
  signOut: mockSignOut,
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  GoogleAuthProvider: class {},
}));

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let authStateCallback: (user: { uid: string; email: string } | null) => void;

  beforeEach(() => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: typeof authStateCallback) => {
      authStateCallback = callback;
      return vi.fn();
    });
    mockSignInWithPopup.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: FIREBASE_AUTH, useValue: {} },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('initializes user as null', () => {
    expect(service.user()).toBeNull();
  });

  it('updates user signal when auth state changes to a user', () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' };
    authStateCallback(mockUser);
    expect(service.user()).toEqual(mockUser);
  });

  it('sets user to null when auth state changes to null', () => {
    authStateCallback({ uid: 'user123', email: 'test@example.com' });
    authStateCallback(null);
    expect(service.user()).toBeNull();
  });

  it('calls signInWithPopup with a GoogleAuthProvider on signInWithGoogle', async () => {
    await service.signInWithGoogle();
    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
  });

  it('clears signInError on a successful sign-in', async () => {
    await service.signInWithGoogle();
    expect(service.signInError()).toBeNull();
  });

  it('sets signInError message on popup failure', async () => {
    mockSignInWithPopup.mockRejectedValue(new Error('popup closed'));
    await service.signInWithGoogle();
    expect(service.signInError()).toBe('Sign in failed, please try again');
  });

  it('calls Firebase signOut on signOut()', async () => {
    await service.signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

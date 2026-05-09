import { Injectable, inject, signal } from '@angular/core';
import { User, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly _user = signal<User | null>(null);
  private readonly _signInError = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly signInError = this._signInError.asReadonly();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this._user.set(user);
    });
  }

  async signInWithGoogle(): Promise<void> {
    this._signInError.set(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
    } catch {
      this._signInError.set('Sign in failed, please try again');
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
}

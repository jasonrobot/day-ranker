import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../firebase';
import { AuthService } from './auth.service';
import { AppSettings, YearState } from '../models/app.model';

const DEFAULT_SETTINGS: AppSettings = { customFields: [] };

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);
  private readonly authService = inject(AuthService);

  private localKey(uid: string, year: number): string {
    return `day-ranker:${uid}:${year}`;
  }

  private localSettingsKey(uid: string): string {
    return `day-ranker:${uid}:settings`;
  }

  async loadYear(year: number): Promise<YearState | null> {
    const uid = this.authService.user()?.uid;
    if (!uid) return null;

    try {
      const ref = doc(this.firestore, `users/${uid}/years/${year}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as YearState;
      }
    } catch (e) {
      console.error('Firestore read failed, falling back to localStorage', e);
    }

    const raw = localStorage.getItem(this.localKey(uid, year));
    return raw ? JSON.parse(raw) : null;
  }

  async saveYear(year: number, state: YearState): Promise<void> {
    const uid = this.authService.user()?.uid;
    if (!uid) return;

    localStorage.setItem(this.localKey(uid, year), JSON.stringify(state));

    const ref = doc(this.firestore, `users/${uid}/years/${year}`);
    setDoc(ref, state).catch(e => {
      console.error('Firestore write failed', e);
    });
  }

  async loadSettings(): Promise<AppSettings> {
    const uid = this.authService.user()?.uid;
    if (!uid) return DEFAULT_SETTINGS;

    try {
      const ref = doc(this.firestore, `users/${uid}/settings/data`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as AppSettings;
      }
    } catch (e) {
      console.error('Firestore settings read failed, falling back to localStorage', e);
    }

    const raw = localStorage.getItem(this.localSettingsKey(uid));
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const uid = this.authService.user()?.uid;
    if (!uid) return;

    localStorage.setItem(this.localSettingsKey(uid), JSON.stringify(settings));

    const ref = doc(this.firestore, `users/${uid}/settings/data`);
    setDoc(ref, settings).catch(e => {
      console.error('Firestore settings write failed', e);
    });
  }
}

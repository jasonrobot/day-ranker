import { InjectionToken, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import { Firestore, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { environment } from '../environments/environment';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp', {
  providedIn: 'root',
  factory: () => initializeApp(environment.firebase),
});

export const FIREBASE_AUTH = new InjectionToken<Auth>('FirebaseAuth', {
  providedIn: 'root',
  factory: () => {
    const auth = getAuth(inject(FIREBASE_APP));
    if (environment.useEmulator) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
    return auth;
  },
});

export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FirebaseFirestore', {
  providedIn: 'root',
  factory: () => {
    const firestore = getFirestore(inject(FIREBASE_APP));
    if (environment.useEmulator) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
    return firestore;
  },
});

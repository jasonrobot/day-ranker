import { InjectionToken, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp', {
  providedIn: 'root',
  factory: () => initializeApp(environment.firebase),
});

export const FIREBASE_AUTH = new InjectionToken<Auth>('FirebaseAuth', {
  providedIn: 'root',
  factory: () => getAuth(inject(FIREBASE_APP)),
});

export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FirebaseFirestore', {
  providedIn: 'root',
  factory: () => getFirestore(inject(FIREBASE_APP)),
});

import { Injectable, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { CalendarStore } from '../calendar/calendar.store';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly authService = inject(AuthService);
  private readonly storageService = inject(StorageService);
  private readonly calendarStore = inject(CalendarStore);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.onLogin();
      } else {
        this.onLogout();
      }
    });
  }

  async onLogin(): Promise<void> {
    const year = new Date().getFullYear();
    const state = await this.storageService.loadYear(year);
    if (state) {
      this.calendarStore.hydrate(state);
    }
  }

  onLogout(): void {
    this.calendarStore.reset();
  }
}

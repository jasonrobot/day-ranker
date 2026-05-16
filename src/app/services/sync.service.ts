import { Injectable, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { CalendarStore } from '../calendar/calendar.store';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly authService = inject(AuthService);
  private readonly calendarStore = inject(CalendarStore);
  private activeUid: string | null = null;

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
    const uid = this.authService.user()?.uid ?? null;
    if (!uid || uid === this.activeUid) return;
    this.activeUid = uid;
    await this.calendarStore.setYear(new Date().getFullYear());
  }

  onLogout(): void {
    this.activeUid = null;
    this.calendarStore.reset();
  }
}

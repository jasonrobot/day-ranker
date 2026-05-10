import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  protected readonly authService = inject(AuthService);

  async signIn(): Promise<void> {
    await this.authService.signInWithGoogle();
  }
}

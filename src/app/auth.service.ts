import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

interface LoginResponse {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http    = inject(HttpClient);
  private baseUrl = 'http://localhost:5150';

  // Signal — true when a token exists in localStorage
  isLoggedIn      = signal(!!localStorage.getItem('access_token'));
  sessionExpired  = signal(false);

  // Decoded email from JWT payload
  get currentEmail(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email ?? null;
    } catch { return null; }
  }

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/api/auth/login`, { email, password })
      .pipe(
        tap(res => {
          localStorage.setItem('access_token', res.access_token);
          this.isLoggedIn.set(true);
        })
      );
  }

  logout() {
    localStorage.removeItem('access_token');
    this.isLoggedIn.set(false);
  }
}

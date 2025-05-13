import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, interval } from 'rxjs';
import { Router } from '@angular/router';
import { catchError, tap, switchMap } from 'rxjs/operators';

export interface SignInRequest {
  login: string;
  password: string;
}

export interface SignInResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignUpRequest {
  login: string;
  password: string;
  email: string;
  verificationCode: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RecoverPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/auth';
  private refreshInterval: any;

  constructor(private http: HttpClient, private router: Router) {
    this.startTokenRefreshTimer();
  }

  signIn(data: SignInRequest): Observable<SignInResponse> {
    return this.http.post<SignInResponse>(`${this.apiUrl}/sign-in`, data).pipe(
      tap((response: SignInResponse) => {
        console.log('Sign-in response:', response);
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('expiresIn', response.expiresIn.toString());
        console.log('Stored expiresIn:', response.expiresIn);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Sign-in error:', err);
        return throwError(() => err);
      })
    );
  }

  signUp(data: SignUpRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sign-up`, data).pipe(
      tap(() => {
        console.log('Sign-up successful');
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Sign-up error:', err);
        return throwError(() => err);
      })
    );
  }

  confirmEmail(email: string): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/email-confirmation`, { email }).pipe(
      tap((code: number) => {
        console.log('Verification code sent:', code);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Confirm email error:', err);
        return throwError(() => err);
      })
    );
  }

  recoverPassword(email: string): Observable<string> {
    const request: RecoverPasswordRequest = { email };
    return this.http.post(`${this.apiUrl}/recovery-password`, request, { responseType: 'text' }).pipe(
      tap((response: string) => {
        console.log('Recovery email sent:', response);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Recover password error:', err);
        return throwError(() => err);
      })
    );
  }

  resetPassword(data: ResetPasswordRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/reset-password`, data, { responseType: 'text' }).pipe(
      tap((response: string) => {
        console.log('Password reset successful:', response);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Reset password error:', err);
        const errorMessage = err.error?.message || 'Failed to reset password';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('Sending refresh token:', refreshToken);
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.http.post<RefreshTokenResponse>(`${this.apiUrl}/refresh`, request).pipe(
      tap((response: RefreshTokenResponse) => {
        console.log('Refresh response:', response);
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('expiresIn', response.expiresIn.toString());
        console.log('Stored expiresIn after refresh:', response.expiresIn);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Refresh token error:', err);
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresIn');

    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }

    if (!refreshToken) {
      this.router.navigate(['/auth']);
      return of(null);
    }

    return this.http.post(`${this.apiUrl}/logout`, { refreshToken }).pipe(
      tap(() => {
        this.router.navigate(['/auth']);
      }),
      catchError((err) => {
        this.router.navigate(['/auth']);
        return of(null);
      })
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<string> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      return throwError(() => new Error('User is not authenticated'));
    }

    console.log('Sending change password request with token:', token);
    return this.http.post(`${this.apiUrl}/change-password`, data, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }),
      responseType: 'text',
      observe: 'response'
    }).pipe(
      tap((response: any) => {
        console.log('Change Password response:', response);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Change password error:', err);
        const errorMessage = err.error instanceof Blob || typeof err.error === 'string'
          ? err.error.toString()
          : 'Failed to change password';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const expiresIn = localStorage.getItem('expiresIn');

    if (!token || !expiresIn) {
      return false;
    }

    let iat: number;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      iat = payload.iat;
      if (!iat) {
        console.error('iat not found in token');
        return false;
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      return false;
    }

    const expiresInMs = parseInt(expiresIn, 10);
    const expirationTime = iat * 1000 + expiresInMs;
    const currentTime = new Date().getTime();

    console.log('Current time:', currentTime);
    console.log('Expiration time:', expirationTime);

    return currentTime < expirationTime;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id;
      if (!userId) {
        console.error('id not found in token');
        return null;
      }
      return userId;
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  }

  getTokenExpirationTime(): number | null {
    const token = localStorage.getItem('token');
    const expiresIn = localStorage.getItem('expiresIn');

    if (!token || !expiresIn) {
      return null;
    }

    let iat: number;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      iat = payload.iat;
      if (!iat) {
        console.error('iat not found in token');
        return null;
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }

    const expiresInMs = parseInt(expiresIn, 10);
    const expirationTime = iat * 1000 + expiresInMs;
    return expirationTime;
  }

  shouldRefreshToken(): boolean {
    const expirationTime = this.getTokenExpirationTime();
    if (!expirationTime) {
      return false;
    }

    const currentTime = new Date().getTime();
    const timeUntilExpiration = expirationTime - currentTime;
    const refreshThreshold = 60 * 1000;

    return timeUntilExpiration < refreshThreshold;
  }

  private startTokenRefreshTimer(): void {
    this.refreshInterval = interval(30 * 1000).pipe(
      switchMap(() => {
        if (this.shouldRefreshToken()) {
          console.log('Token is about to expire, refreshing proactively');
          return this.refreshToken();
        }
        return of(null);
      })
    ).subscribe({
      error: (err) => {
        console.error('Proactive token refresh failed:', err);
      }
    });
  }
}
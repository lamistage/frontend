import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, interval } from 'rxjs';
import { Router } from '@angular/router';
import { catchError, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/auth';
  private refreshInterval: any;

  constructor(private http: HttpClient, private router: Router) {
    this.startTokenRefreshTimer();
  }

  signIn(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sign-in`, data).pipe(
      tap((response: any) => {
        console.log('Sign-in response:', response);
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('expiresIn', response.expiresIn.toString());
        console.log('Stored expiresIn:', response.expiresIn);
      })
    );
  }

  signUp(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sign-up`, data);
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('Sending refresh token:', refreshToken);
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((response: any) => {
        console.log('Refresh response:', response);
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken); 
        localStorage.setItem('expiresIn', response.expiresIn.toString());
        console.log('Stored expiresIn after refresh:', response.expiresIn);
      }),
      catchError((err) => {
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
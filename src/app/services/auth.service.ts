import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/auth';

  constructor(private http: HttpClient, private router: Router) {}

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

    // Извлекаем iat из токена
    let iat: number;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      iat = payload.iat; // Время выпуска токена в секундах
      if (!iat) {
        console.error('iat not found in token');
        return false;
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      return false;
    }

    const expiresInMs = parseInt(expiresIn, 10); 
    const expirationTime = iat*1000 + expiresInMs; 
    const currentTime = new Date().getTime();

    console.log('Current time:', currentTime);
    console.log('Expiration time:', expirationTime);

    return currentTime < expirationTime;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
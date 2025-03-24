import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/auth';
  
  constructor(private http: HttpClient, private router: Router) {}

  signIn(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sign-in`, data);
  }

  signUp(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sign-up`, data);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): Observable<any> {
    localStorage.removeItem('token');
    this.router.navigate(['/auth']);
    return of(null);
  }
}

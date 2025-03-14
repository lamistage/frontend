import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/auth';
  
  constructor(private http: HttpClient) {}


  signIn(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sign-in`, data);
  }

  signUp(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sign-up`, data);
  }
}

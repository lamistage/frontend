import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Image } from '../models/image';


@Injectable({
  providedIn: 'root'
})
export class AddImageService {
  private apiUrl = '/api';
  
  constructor(private http: HttpClient) {}

  uploadImage(image: FormData): Observable<{filePath: string}> {
    return this.http.post<{ filePath: string }>(`${this.apiUrl}/db-file`, image, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
    });
  }

  saveImage(imageData: any): Observable<Image> {
    return this.http.post<Image>(`${this.apiUrl}/image`, imageData, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }),
    });
  }
}

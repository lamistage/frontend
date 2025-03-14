import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; 
import { Image } from '../models/image';


@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getImages(tags: string[], users: string[], sort: string): Observable<Image[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    let params = new URLSearchParams();
    tags.forEach(tag => params.append('tag', tag));
    users.forEach(user => params.append('user', user));
    params.append('sort', sort);

    return this.http.get<{ content: Image[] }>(`${this.apiUrl}/image?${params.toString()}`, { headers })
      .pipe(map(response => response.content)); 
  }

  getImage(imagePath: string): Observable<Blob> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<Blob>(`${this.apiUrl}/${imagePath}`, { headers, responseType: 'blob' as 'json' });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; 
import { Image, User } from '../models/image';
import { switchMap } from 'rxjs/operators';
import { Tag } from '../models/image';


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

  deleteImage(filePath: string): Observable<void> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.delete<void>(`${this.apiUrl}/${filePath}`, { headers, responseType: 'blob' as 'json' })
  }

  deletePublication(image: Image): Observable<void> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.delete<void>(`${this.apiUrl}/image/${image.id}`, { headers }).pipe(
      switchMap(() => this.http.delete<void>(`${this.apiUrl}/${image.filePath}`, { headers }))
    );
  }

  saveImage(image: Partial<Image>): Observable<Image> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post<Image>(`${this.apiUrl}/image`, image, { headers });
  }

  getAllTags(): Observable<Tag[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<Tag[]>(`${this.apiUrl}/tag`, { headers });
  }

  getAllUsers(): Observable<User[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<User[]>(`${this.apiUrl}/user`, { headers });
  }
}

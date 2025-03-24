import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators'; 
import { Image, User } from '../models/image';
import { switchMap } from 'rxjs/operators';
import { Tag } from '../models/image';

interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

interface Page<T> {
  content: T[];
  page: PageMetadata;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  getImages(tags: string[], users: string[], sort: string, page: number = 0, size: number = 20): Observable<Page<Image>> {
    let params = new URLSearchParams();
    tags.forEach(tag => params.append('tag', tag));
    users.forEach(user => params.append('user', user));
    params.append('sort', sort);
    params.append('page', page.toString());
    params.append('size', size.toString());

    const headers = this.getHeaders();
    const options = headers ? { headers } : {};

    return this.http.get<Page<Image>>(`${this.apiUrl}/image?${params.toString()}`, options).pipe(
      tap(pageData => console.log('Received page data:', pageData))
    );
  }

  getImage(imagePath: string): Observable<Blob> {
    const headers = this.getHeaders();
    const options = headers ? { headers, responseType: 'blob' as 'json' } : { responseType: 'blob' as 'json' };
    return this.http.get<Blob>(`${this.apiUrl}/${imagePath}`, options);
  }

  deleteImage(filePath: string): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.delete<void>(`${this.apiUrl}/${filePath}`, { headers, responseType: 'blob' as 'json' });
  }

  deletePublication(image: Image): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.delete<void>(`${this.apiUrl}/image/${image.id}`, { headers }).pipe(
      switchMap(() => this.http.delete<void>(`${this.apiUrl}/${image.filePath}`, { headers }))
    );
  }

  saveImage(image: Partial<Image>): Observable<Image> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<Image>(`${this.apiUrl}/image`, image, { headers });
  }

  getAllTags(): Observable<Tag[]> {
    const headers = this.getHeaders();
    const options = headers ? { headers } : {};
    return this.http.get<Tag[]>(`${this.apiUrl}/tag`, options);
  }

  getAllUsers(): Observable<User[]> {
    const headers = this.getHeaders();
    const options = headers ? { headers } : {};
    return this.http.get<User[]>(`${this.apiUrl}/user`, options);
  }
}
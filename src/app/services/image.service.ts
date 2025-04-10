import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { Image, User } from '../models/image';
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

  getImages(tags: string[], users: string[], sort: string, page: number = 0, size: number = 20): Observable<Page<Image>> {
    let params = new URLSearchParams();
    tags.forEach(tag => params.append('tag', tag));
    users.forEach(user => params.append('user', user));
    params.append('sort', sort);
    params.append('page', page.toString());
    params.append('size', size.toString());

    return this.http.get<Page<Image>>(`${this.apiUrl}/image?${params.toString()}`).pipe(
      tap(pageData => console.log('Received page data:', pageData))
    );
  }

  getImage(imagePath: string): Observable<Blob> {
    return this.http.get<Blob>(`${this.apiUrl}/${imagePath}`, { responseType: 'blob' as 'json' });
  }

  deleteImage(filePath: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${filePath}`, { responseType: 'blob' as 'json' });
  }

  deletePublication(image: Image): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/image/${image.id}`).pipe(
      switchMap(() => this.http.delete<void>(`${this.apiUrl}/${image.filePath}`))
    );
  }

  saveImage(image: Partial<Image>): Observable<Image> {
    return this.http.post<Image>(`${this.apiUrl}/image`, image);
  }

  getAllTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tag`);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/user`);
  }
}

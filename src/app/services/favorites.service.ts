import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; 
import { Image } from '../models/image';


export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

interface FavoritesResponse {
    content: Image[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class FavoritesService {
    private apiUrl = '/api/likes';

    constructor(private http: HttpClient) {}

    isLiked(userId: number, imageId: number): Observable<boolean> {
        return this.http.get<boolean>(`${this.apiUrl}/is-liked`, {
            params: { userId: userId.toString(), imageId: imageId.toString() }
        });
    }

    addToFavorites(userId: number, imageId: number): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/add`, null, {
            params: { userId: userId.toString(), imageId: imageId.toString() }
        });
    }

    removeFromFavorites(userId: number, imageId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/remove`, {
            params: { userId: userId.toString(), imageId: imageId.toString() }
        });
    }

    getFavorites(
        userId: number,
        page: number,
        size: number,
        tags: string[] = [],
        users: string[] = [],
        sort: string = ''
    ): Observable<Page<Image>> {
        let params = new HttpParams()
            .set('userId', userId.toString())
            .set('page', page.toString())
            .set('size', size.toString());

        if (tags.length > 0) {
            params = params.set('tag', tags.join(','));
        }

        if (users.length > 0) {
            params = params.set('user', users.join(','));
        }

        if (sort) {
            params = params.set('sort', sort);
        }

        return this.http.get<FavoritesResponse>(`${this.apiUrl}/favorites`, { params }).pipe(
            map(response => ({
                content: response.content,
                totalPages: response.page.totalPages,
                totalElements: response.page.totalElements,
                number: response.page.number,
                size: response.page.size
            }))
        );
    }
}

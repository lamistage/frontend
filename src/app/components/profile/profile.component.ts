import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ImageService } from '../../services/image.service';
import { Image } from '../../models/image';
import { NgIf } from '@angular/common';
import { PublicationComponent } from '../publication/publication.component';
import { MatMenuModule} from '@angular/material/menu';
import { RouterModule } from '@angular/router';


export interface Tag {
  name: string;
}

export interface User {
  login: string;
}

interface SortType {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-profile',
  imports: [
    MatToolbarModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatChipsModule, 
    MatSelectModule, 
    MatInputModule, 
    FormsModule,
    NgIf,
    PublicationComponent,
    MatMenuModule,
    RouterModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  readonly addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly tags = signal<Tag[]>([]);
  readonly announcer = inject(LiveAnnouncer);
  private readonly imageService = inject(ImageService);

  sortTypes: SortType[] = [
    {value: 'date,desc', viewValue: 'newest first'},
    {value: 'date,asc', viewValue: 'oldest first'}
  ];
  selectedSort = signal<string>('date,desc');

  readonly images = signal<Image[]>([]);
  readonly isLoading = signal<boolean>(true);

  constructor() {
    this.loadImages();
  }

  public loadImages() {
    this.isLoading.set(true);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('no token found. please log in.');
      return;
    }

    const userLogin = this.getUserLoginFromToken(token);
    if (!userLogin) {
      alert('Invalid token. Please log in again.');
      return;
    }

    const tagNames = this.tags().map(t => t.name);
    const userLogins = [userLogin];
    const sort = this.selectedSort();

    this.imageService.getImages(tagNames, userLogins, sort).subscribe({
      next: (data) => {
        this.images.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading images:', err);
        this.isLoading.set(false);
      }
    });
  }

  add_tag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      this.tags.update(tags => [...tags, {name: value}]);
    }

    event.chipInput!.clear();
  }

  remove_tag(tag: Tag): void {
    this.tags.update(tags => {
      const index = tags.indexOf(tag);
      if (index < 0) {
        return tags;
      }

      tags.splice(index, 1);
      this.announcer.announce(`Removed ${tag.name}`);
      return [...tags];
    });
  }

  edit_tag(tag: Tag, event: MatChipEditedEvent) {
    const value = event.value.trim();

    if (!value) {
      this.remove_tag(tag);
      return;
    }

    this.tags.update(tags => {
      const index = tags.indexOf(tag);
      if (index >= 0) {
        tags[index].name = value;
        return [...tags];
      }
      return tags;
    });
  }

  changeSort(newSort: string) {
    this.selectedSort.set(newSort);
    this.loadImages();
  }
  
  onPublicationDeleted(imageId: number) {
    this.images.update(images => images.filter(img => img.id !== imageId));
  }

  private getUserLoginFromToken(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])); 
      return payload.sub || null; 
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  }
}

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
import { NgIf, CommonModule } from '@angular/common';
import { PublicationComponent } from '../publication/publication.component';
import { MatMenuModule} from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { map, startWith } from 'rxjs/operators';


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
    CommonModule,
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
    RouterModule,
    MatAutocompleteModule,
    ReactiveFormsModule
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  sortTypes: SortType[] = [
    {value: 'date,desc', viewValue: 'newest first'},
    {value: 'date,asc', viewValue: 'oldest first'}
  ];
  selectedSort = signal<string>('date,desc');

  readonly images = signal<Image[]>([]);
  readonly isLoading = signal<boolean>(true);

  tagCtrl = new FormControl('');
  allTags: Tag[] = [];
  filteredTags: Observable<Tag[]>;

  constructor() {
    this.loadAllTags();
    this.loadImages();

    this.filteredTags = this.tagCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTags(value || ''))
    );
  }

  loadAllTags() {
    this.imageService.getAllTags().subscribe({
      next: (tags) => {
        this.allTags = tags;
      },
      error: (err) => {
        console.error('error loading tags', err);
      }
    })
  }

  private _filterTags(value: string): Tag[] {
    const filterValue = value.toLowerCase();
    return this.allTags.filter(tag => tag.name.toLowerCase().includes(filterValue));
  }

  public loadImages() {
    this.isLoading.set(true);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('no token found. please log in.');
      this.router.navigate(['/auth']);
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

  selectedTag(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value;
    this.tags.update(tags => [...tags, { name: value }]);
    this.tagCtrl.setValue('');
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

  logout() {
    this.authService.logout().subscribe({
      next: () => {

      },
      error: (err) => {
        console.error('logout failed', err);
        alert('failed to logout. please try again');
      }
    })
  }
}

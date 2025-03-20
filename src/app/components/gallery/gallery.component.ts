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
  selector: 'app-gallery',
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
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent {
  readonly addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly tags = signal<Tag[]>([]);
  readonly users = signal<User[]>([]);
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

  userCtrl = new FormControl('');
  allUsers: User[] = [];
  filteredUsers: Observable<User[]>;

  constructor() {
    this.loadAllTags();
    this.loadAllUsers();
    this.loadImages();

    this.filteredTags = this.tagCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTags(value || ''))
    );

    this.filteredUsers = this.userCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterUsers(value || ''))
    );
  }

  loadAllTags() {
    this.imageService.getAllTags().subscribe({
      next: (tags) => {
        this.allTags = tags;
      },
      error: (err) => {
        console.error('error loading tags:', err);
      }
    });
  }

  loadAllUsers() {
    this.imageService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
      },
      error: (err) => {
        console.error('error loading users:', err)
      }
    });
  }

  private _filterTags(value: string): Tag[] {
    const filterValue = value.toLowerCase();
    return this.allTags.filter(tag => tag.name.toLowerCase().includes(filterValue));
  }

  private _filterUsers(value: string): User[] {
    const filterValue = value.toLowerCase();
    return this.allUsers.filter(user => user.login.toLowerCase().includes(filterValue));
  }

  public loadImages() {
    this.isLoading.set(true);

    const tagNames = this.tags().map(t => t.name);
    const userLogins = this.users().map(u => u.login);
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

  add_user(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      this.users.update(users => [...users, {login: value}]);
    }

    event.chipInput!.clear();
  }

  remove_user(user: User): void {
    this.users.update(users => {
      const index = users.indexOf(user);
      if (index < 0) {
        return users;
      }

      users.splice(index, 1);
      this.announcer.announce(`Removed ${user.login}`);
      return [...users];
    });
  }

  edit_user(user: User, event: MatChipEditedEvent) {
    const value = event.value.trim();

    if (!value) {
      this.remove_user(user);
      return;
    }

    this.users.update(users => {
      const index = users.indexOf(user);
      if (index >= 0) {
        users[index].login = value;
        return [...users];
      }
      return users;
    });
  }

  selectedUser(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value;
    this.users.update(users => [...users, { login: value }]);
    this.userCtrl.setValue('');
  }

  changeSort(newSort: string) {
    this.selectedSort.set(newSort);
    this.loadImages();
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

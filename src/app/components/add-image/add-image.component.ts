import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddImageService } from '../../services/add-image.service';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule} from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
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

@Component({
  selector: 'app-add-image',
  standalone: true,  
  imports: [
    CommonModule, 
    MatFormFieldModule, 
    MatChipsModule, 
    MatIconModule, 
    MatButtonModule,
    MatToolbarModule,
    MatMenuModule,
    RouterModule,
    MatAutocompleteModule,
    ReactiveFormsModule
  ], 
  templateUrl: './add-image.component.html',
  styleUrls: ['./add-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddImageComponent {
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploadSuccess: boolean = false;
  imageUrl: string | null = null;

  readonly addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly tags = signal<Tag[]>([]);
  readonly announcer = inject(LiveAnnouncer);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly addImageService = inject(AddImageService);

  tagCtrl = new FormControl('');
  allTags: Tag[] = [];
  filteredTags: Observable<Tag[]>;

  constructor() {
    this.loadAllTags();

    this.filteredTags = this.tagCtrl.valueChanges.pipe(
      startWith(null),
      map((tag: string | null) => (tag ? this._filter(tag) : this.allTags.slice()))
    );
  }

  loadAllTags() {
    this.addImageService.getAllTags().subscribe({
      next: (tags) => {
        this.allTags = tags;
      },
      error: (err) => {
        console.error('Error loading tags:', err)
      }
    });
  }

  private _filter(value: string): Tag[] {
    const filterValue = value.toLowerCase();
    return this.allTags.filter(tag => tag.name.toLowerCase().includes(filterValue));
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0]; 
      if (this.isValidFileType(file)) {
        const fakeEvent = { target: { files: [file] } } as any;
        this.onFileSelected(fakeEvent);
      } else {
        alert('please select a .jpg or .png file.');
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (this.isValidFileType(file)) {
        this.selectedFile.set(file);
        // Создаем URL для предпросмотра
        this.previewUrl.set(URL.createObjectURL(file));
        console.log('File selected:', this.selectedFile());
      } else {
        alert('Please select a .jpg or .png file.');
        this.selectedFile.set(null);
        this.previewUrl.set(null);
        input.value = '';
      }
    }
  }

  private isValidFileType(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png'];
    return allowedTypes.includes(file.type);
  }

  clearFile() {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!); 
    }
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  get isUploadDisabled(): boolean {
    return !this.selectedFile() || this.tags().length === 0;
  }  

  uploadPhoto() {
    if(!this.selectedFile) {
      alert('Please select a file');
      return;
    }

    const file = this.selectedFile()!;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('no token found. please log in.');
      this.router.navigate(['/auth']);
      return;
    }

    const userId = this.getUserIdFromToken(token);
    if (!userId) {
      alert('Invalid token. Please log in again.');
      return;
    }

    const userLogin = this.getUserLoginFromToken(token);
    if (!userLogin) {
      alert('Invalid token. Please log in again.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    this.addImageService.uploadImage(formData).subscribe({
      next: (uploadResponse) => {
        console.log('uploadResponse:', uploadResponse);
        const filePath = uploadResponse.filePath;

        const imageData = {
          filePath,
          user: {
            id: Number(userId),
            login: userLogin,
          },
          tags: this.tags(),
        }

        console.log(imageData);

        this.addImageService.saveImage(imageData).subscribe({
          next: () => {
            alert('Image added successfully');
            console.log('Image added successfully', imageData);
            this.tags.set([]);
            this.selectedFile.set(null);
            this.previewUrl.set(null);
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
          },
          error: (err) => {
            console.error('Error saving image:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error uploading image:', err);
      }
    });
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    
    if (value) {
      this.tags.update(tags => [...tags, {name: value}]);
    }

    event.chipInput!.clear();
  }

  remove(tag: Tag): void {
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

  edit(tag: Tag, event: MatChipEditedEvent): void {
    const value = event.value.trim();

    if (!value) {
      this.remove(tag);
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

  selected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value;
    this.tagCtrl.setValue(null);
    this.tags.update(tags => [...tags, {name: value}]);
    event.option.deselect();
  }

  private getUserIdFromToken(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])); 
      return payload.id || null; 
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
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

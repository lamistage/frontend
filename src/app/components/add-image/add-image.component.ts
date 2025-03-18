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
    RouterModule
  ], 
  templateUrl: './add-image.component.html',
  styleUrls: ['./add-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddImageComponent {
  selectedFile: File | null = null;
  uploadSuccess: boolean = false;
  imageUrl: string | null = null;

  readonly addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly tags = signal<Tag[]>([]);
  readonly announcer = inject(LiveAnnouncer);

  constructor(private addImageService: AddImageService) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  get isUploadDisabled(): boolean {
    return !this.selectedFile || this.tags().length === 0;
  }  

  uploadPhoto() {
    if(!this.selectedFile) {
      alert('Please select a file');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('no token found. please log in.');
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
    formData.append('image', this.selectedFile);

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
            this.selectedFile =  null;
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

    // Add our fruit
    if (value) {
      this.tags.update(tags => [...tags, {name: value}]);
    }

    // Clear the input value
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

  edit(tag: Tag, event: MatChipEditedEvent) {
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
}

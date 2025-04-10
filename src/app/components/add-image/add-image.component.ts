import { ChangeDetectionStrategy, Component, inject, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddImageService } from '../../services/add-image.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

export interface Tag {
  name: string;
}

@Component({
    selector: 'app-add-image',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatToolbarModule,
        RouterModule
    ],
    templateUrl: './add-image.component.html',
    styleUrls: ['./add-image.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddImageComponent {
  @ViewChild('tagInput') tagInput!: ElementRef;
  @ViewChild('menuContainer', { static: false }) menuContainer!: ElementRef;

  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploadSuccess: boolean = false;
  imageUrl: string | null = null;

  readonly tags = signal<Tag[]>([]);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly addImageService = inject(AddImageService);

  allTags: Tag[] = [];
  filteredTags: Tag[] = [];
  areTagsLoaded = false;

  showBadFileTypeMessage = signal(false);
  showSuccessMessage = signal(false);

  isMenuOpen = false;

  constructor() {
    this.checkAuthentication();
  }

  private checkAuthentication(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth']);
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (this.isMenuOpen) {
      const menuContainerElement = this.menuContainer?.nativeElement as HTMLElement;
      const burgerButton = menuContainerElement?.querySelector('.burger-button');
      const customMenu = menuContainerElement?.querySelector('.custom-menu');
      const clickedInsideMenu = menuContainerElement?.contains(target);
      const clickedOnBurgerButton = burgerButton?.contains(target);
      const clickedInsideCustomMenu = customMenu?.contains(target);

      if (!clickedInsideMenu || (clickedInsideMenu && !clickedOnBurgerButton && !clickedInsideCustomMenu)) {
        this.closeMenu();
      }
    }
  }

  loadAllTags() {
    if (this.areTagsLoaded) return;

    this.addImageService.getAllTags().subscribe({
      next: (tags) => {
        this.allTags = tags;
        this.areTagsLoaded = true;
      },
      error: (err) => {
        console.error('Error loading tags:', err);
        this.areTagsLoaded = true;
      }
    });
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
        this.showBadFileTypeMessage.set(true);
        setTimeout(() => {
          this.showBadFileTypeMessage.set(false);
        }, 5000);
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (this.isValidFileType(file)) {
        this.selectedFile.set(file);
        this.previewUrl.set(URL.createObjectURL(file));
        console.log('File selected:', this.selectedFile());
      } else {
        this.showBadFileTypeMessage.set(true);
        setTimeout(() => {
          this.showBadFileTypeMessage.set(false);
        }, 5000);
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
    if (!this.selectedFile()) {
      alert('Please select a file');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      alert('Session expired. Please log in again.');
      this.authService.logout().subscribe(() => {
        this.router.navigate(['/auth']);
      });
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.authService.logout().subscribe(() => {
        this.router.navigate(['/auth']);
      });
      return;
    }

    const userId = this.getUserIdFromToken(token);
    const userLogin = this.getUserLoginFromToken(token);

    if (!userId || !userLogin) {
      this.authService.logout().subscribe(() => {
        this.router.navigate(['/auth']);
      });
      return;
    }

    const file = this.selectedFile()!;

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
        };

        console.log(imageData);

        this.addImageService.saveImage(imageData).subscribe({
          next: () => {
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

  onTagInputFocus() {
    this.loadAllTags();
  }

  addTagFromInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const tagName = input.value.trim();
    if (tagName) {
      const newTag = { name: tagName };
      const tagExists = this.tags().some(
        t => t.name.toLowerCase() === tagName.toLowerCase()
      );
      if (!tagExists) {
        this.tags.update(tags => [...tags, newTag]);
      }
      input.value = '';
      this.filteredTags = [];
    }
  }

  remove(tag: Tag): void {
    this.tags.update(tags => tags.filter(t => t !== tag));
  }

  filterTags(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim().toLowerCase();
    if (value) {
      this.filteredTags = this.allTags.filter(tag =>
        tag.name.toLowerCase().includes(value) &&
        !this.tags().some(t => t.name.toLowerCase() === tag.name.toLowerCase())
      );
    } else {
      this.filteredTags = [];
    }
  }

  selectTag(tag: Tag): void {
    const tagExists = this.tags().some(
      t => t.name.toLowerCase() === tag.name.toLowerCase()
    );
    if (!tagExists) {
      this.tags.update(tags => [...tags, tag]);
    }
    this.tagInput.nativeElement.value = '';
    this.filteredTags = [];
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
        this.router.navigate(['/auth']);
      },
      error: (err) => {
        console.error('logout failed', err);
      }
    });
  }
}

import { Component, EventEmitter, Input, Output, signal, ViewChild, ElementRef } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Image } from '../../models/image';
import { Tag } from '../../models/image';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { ImageService } from '../../services/image.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-publication',
  imports: [
    MatIconModule, 
    MatChipsModule, 
    CommonModule,
    MatButtonModule,
    MatFormFieldModule
  ],
  templateUrl: './publication.component.html',
  styleUrl: './publication.component.scss',
  standalone: true
})
export class PublicationComponent {
  @Input() publication!: Image;
  @Input() isProfilePage: boolean = false;
  @Output() deleted = new EventEmitter<number>();
  @ViewChild('tagInput') tagInput!: ElementRef;

  imageBlob!: Blob;
  imageLoaded = false;
  originalFilePath!: string;
  isEditing = signal(false);
  editableTags = signal<Tag[]>([]);
  allTags: Tag[] = []; // Храним все доступные теги
  filteredTags: Tag[] = []; // Храним отфильтрованные теги для автодополнения

  constructor(private clipboard: Clipboard, private imageService: ImageService) {}

  ngOnInit() {
    this.originalFilePath = this.publication.filePath;
    this.loadImage();
    this.editableTags.set([...this.publication.tags]);
    this.loadAllTags(); // Загружаем все теги при инициализации
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['publication'] && changes['publication'].currentValue) {
      this.originalFilePath = this.publication.filePath;
      this.loadImage();
      this.editableTags.set([...this.publication.tags]);
    }
  }

  private loadImage() {
    this.imageLoaded = false;
    this.imageService.getImage(this.publication.filePath).subscribe({
      next: (blob) => {
        this.imageBlob = blob;
        this.publication.filePath = URL.createObjectURL(blob);  
        this.imageLoaded = true;
      },
      error: (err) => {
        console.error('Failed to load image:', err);
        this.imageLoaded = false;
      },
    });
  }

  private loadAllTags() {
    this.imageService.getAllTags().subscribe({
      next: (tags) => {
        this.allTags = tags; // Сохраняем все теги
      },
      error: (err) => {
        console.error('Error loading tags:', err);
      }
    });
  }

  async copyImage() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [this.imageBlob.type]: this.imageBlob }),
      ]);
      alert('The image has been copied to the clipboard!');
    } catch (err) {
      console.error('Copy error:', err);
      alert('Failed to copy the image.');
    }
  }

  deletePublication() {
    if (confirm('Are you sure you want to delete this publication?')) { 
      const imageToDelete = { ...this.publication, filePath: this.originalFilePath };
      this.imageService.deletePublication(imageToDelete).subscribe({
        next: () => {
          alert('Publication deleted successfully!');
          this.deleted.emit(this.publication.id);
        },
        error: (err) => {
          console.error('Failed to delete publication:', err);
          alert('Failed to delete the publication.');
        }
      });
    }
  }

  startEditing() {
    this.isEditing.set(true);
    this.editableTags.set([...this.publication.tags]);
  }

  saveTags() {
    if (this.editableTags().length === 0) {
      console.warn('No tags to save');
      return;
    }
    const updatedImage = { 
      id: this.publication.id, 
      filePath: this.originalFilePath, 
      user: this.publication.user,
      tags: this.editableTags() 
    };
    console.log('Sending to server:', updatedImage);
    this.imageService.saveImage(updatedImage).subscribe({
      next: (updated) => {
        console.log('Server response:', updated);
        if (updated && updated.tags) {
          this.publication.tags = updated.tags;
          this.publication.date = updated.date;
        } else {
          console.warn('Server returned null, using local tags');
          this.publication.tags = this.editableTags();
        }
        this.isEditing.set(false);
        alert('Tags updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update tags:', err);
        alert('Failed to update tags. Please try again.');
      }
    });
  }

  removeTag(tag: Tag): void {
    this.editableTags.update(tags => tags.filter(t => t !== tag));
  }

  addTagFromInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const tagName = input.value.trim();
    if (tagName) {
      const newTag = { name: tagName };
      const tagExists = this.editableTags().some(
        t => t.name.toLowerCase() === tagName.toLowerCase()
      );
      if (!tagExists) {
        this.editableTags.update(tags => [...tags, newTag]);
      }
      input.value = '';
      this.filteredTags = []; // Очищаем автодополнение
    }
  }

  filterTags(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim().toLowerCase();
    if (value) {
      this.filteredTags = this.allTags.filter(tag =>
        tag.name.toLowerCase().includes(value) &&
        !this.editableTags().some(t => t.name.toLowerCase() === tag.name.toLowerCase())
      );
    } else {
      this.filteredTags = [];
    }
  }

  selectTag(tag: Tag): void {
    const tagExists = this.editableTags().some(
      t => t.name.toLowerCase() === tag.name.toLowerCase()
    );
    if (!tagExists) {
      this.editableTags.update(tags => [...tags, tag]);
    }
    this.tagInput.nativeElement.value = '';
    this.filteredTags = [];
  }
}

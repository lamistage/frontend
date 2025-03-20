import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Image } from '../../models/image';
import { MatIconModule } from '@angular/material/icon';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { ImageService } from '../../services/image.service';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { SimpleChanges } from '@angular/core';
import { Tag } from '../../models/image';



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
  imageBlob!: Blob;
  imageLoaded = false;
  originalFilePath!: string;
  isEditing = signal(false);
  editableTags = signal<Tag[]>([]);
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  constructor(private clipboard: Clipboard, private imageService: ImageService) {}

  ngOnInit() {
    this.originalFilePath = this.publication.filePath;
    this.loadImage();
    this.editableTags.set([...this.publication.tags]);
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
  }

  saveTags() {
    if (this.editableTags().length === 0) {
      console.warn('no tags to save');
      return
    }
    const updatedImage = { 
      id: this.publication.id, 
      filePath: this.originalFilePath, 
      user: this.publication.user,
      tags: this.editableTags() 
    };
    console.log('sending to server:', updatedImage);
    this.imageService.saveImage(updatedImage).subscribe({
      next: (updated) => {
        console.log('server response:', updated);
        if (updated && updated.tags) {
          this.publication.tags = updated.tags;
          this.publication.date = updated.date;
        } else {
          console.warn('server returned null, using local tags');
          this.publication.tags = this.editableTags();
        }
        this.isEditing.set(false);
        alert('Tags updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update tags:', err);
        alert('Failed to update tags. Please try again.')
      }
    });
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.editableTags.update(tags => [...tags, { name: value}]);
    }
    event.chipInput!.clear();
  }

  removeTag(tag: Tag): void {
    this.editableTags.update(tags => tags.filter(t => t !== tag));
  }

  editTag(tag: Tag, event: MatChipEditedEvent): void {
    const value = event.value.trim();
    if (!value) {
      this.removeTag(tag);
      return;
    }
    this.editableTags.update(tags => {
      const index = tags.indexOf(tag);
      if (index >= 0) {
        tags[index] = { name: value };
        return [...tags];
      }
      return tags;
    });
  }
}

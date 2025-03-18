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
  editableTags = signal<Image['tags']>([]);
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
}

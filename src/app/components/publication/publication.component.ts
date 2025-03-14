import { Component, Input } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Image } from '../../models/image';
import {MatIconModule} from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { ImageService } from '../../services/image.service';


@Component({
  selector: 'app-publication',
  imports: [MatIconModule, MatChipsModule, CommonModule],
  templateUrl: './publication.component.html',
  styleUrl: './publication.component.scss',
  standalone: true
})
export class PublicationComponent {
  @Input() publication!: Image;
  imageBlob!: Blob;
  imageLoaded = false;

  constructor(private clipboard: Clipboard, private imageService: ImageService) {}

  ngOnInit() {
    this.loadImage();
  }

  private loadImage() {
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
}

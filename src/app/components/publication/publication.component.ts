import { Component, EventEmitter, Input, Output, signal, ViewChild, ElementRef } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Image, Tag } from '../../models/image';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { ImageService } from '../../services/image.service';
import { FavoritesService } from '../../services/favorites.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { SimpleChanges } from '@angular/core';
import { AuthService } from '../../services/auth.service';


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
    allTags: Tag[] = [];
    filteredTags: Tag[] = [];
    showCopyMessage = signal(false);
    isFavorited: boolean = false;

    isDialogOpen = signal<boolean>(false);

    constructor(
        private clipboard: Clipboard,
        private imageService: ImageService,
        private favoritesService: FavoritesService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.originalFilePath = this.publication.filePath;
        this.loadImage();
        this.editableTags.set([...this.publication.tags]);
        this.checkIfFavorited();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['publication'] && changes['publication'].currentValue) {
            this.originalFilePath = this.publication.filePath;
            this.loadImage();
            this.editableTags.set([...this.publication.tags]);
            this.checkIfFavorited();
        }
    }

    isAuthenticated(): boolean {
        return !!this.authService.getUserId();
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
                this.allTags = tags;
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
            this.showCopyMessage.set(true);
            setTimeout(() => {
                this.showCopyMessage.set(false);
            }, 1000);
        } catch (err) {
            console.error('Copy error:', err);
            alert('Failed to copy the image.');
        }
    }

    openDeleteDialog(): void {
        this.isDialogOpen.set(true);
    }

    closeDeleteDialog(): void {
        this.isDialogOpen.set(false);
    }

    confirmDelete(): void {
        const imageToDelete = { ...this.publication, filePath: this.originalFilePath };
        this.imageService.deletePublication(imageToDelete).subscribe({
            next: () => {
                this.deleted.emit(this.publication.id);
                this.closeDeleteDialog();
            },
            error: (err) => {
                console.error('Failed to delete publication:', err);
                alert('Failed to delete the publication.');
                this.closeDeleteDialog();
            }
        });
    }

    deletePublication() {
        this.openDeleteDialog();
    }

    startEditing() {
        this.isEditing.set(true);
        this.editableTags.set([...this.publication.tags]);
        this.loadAllTags();
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
            },
            error: (err) => {
                console.error('Failed to update tags:', err);
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
            this.filteredTags = [];
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

    private checkIfFavorited(): void {
        if (!this.isAuthenticated()) {
            this.isFavorited = false;
            return;
        }

        const userId = this.authService.getUserId();
        this.favoritesService.isLiked(userId!, this.publication.id).subscribe({
            next: (isFavorited) => {
                this.isFavorited = isFavorited;
            },
            error: (err) => {
                console.error('Failed to check if image is favorited:', err);
                this.isFavorited = false;
            }
        });
    }

    toggleFavorite(): void {
        const userId = this.authService.getUserId();
        if (!userId) {
            console.warn('User is not authenticated');
            return;
        }

        if (this.isFavorited) {
            this.favoritesService.removeFromFavorites(userId, this.publication.id).subscribe({
                next: () => {
                    this.isFavorited = false;
                },
                error: (err) => {
                    console.error('Failed to remove from favorites:', err);
                }
            });
        } else {
            this.favoritesService.addToFavorites(userId, this.publication.id).subscribe({
                next: () => {
                    this.isFavorited = true;
                },
                error: (err) => {
                    console.error('Failed to add to favorites:', err);
                }
            });
        }
    }
}

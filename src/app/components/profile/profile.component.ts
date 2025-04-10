import { Component, ViewChild, ElementRef, signal, inject, HostListener } from '@angular/core';
import { ImageService } from '../../services/image.service';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { Image, Tag } from '../../models/image';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PublicationComponent } from '../publication/publication.component';


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
    RouterModule,
    PublicationComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  @ViewChild('tagInput') tagInput!: ElementRef;
  @ViewChild('menuContainer', { static: false }) menuContainer!: ElementRef;
  @ViewChild('tagInputContainer', { static: false }) tagInputContainer!: ElementRef; 
  @ViewChild('sortContainer', { static: false }) sortContainer!: ElementRef; 

  readonly tags = signal<Tag[]>([]);
  readonly images = signal<Image[]>([]);
  readonly isLoading = signal<boolean>(true);
  selectedSort = signal<string>('date,desc');
  sortTypes: SortType[] = [
    { value: 'date,desc', viewValue: 'newest first' },
    { value: 'date,asc', viewValue: 'oldest first' }
  ];
  editingTag: Tag | null = null;
  allTags: Tag[] = [];
  filteredTags: Tag[] = [];
  isSortOpen = false;
  isMenuOpen = false;

  currentPage = signal<number>(0);
  totalPages = signal<number>(1);
  pageSize = 20;

  private readonly imageService = inject(ImageService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    this.checkAuthentication();
    this.loadImages();
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

    if (this.filteredTags.length > 0) {
      const tagInputContainerElement = this.tagInputContainer?.nativeElement as HTMLElement;
      const clickedInsideTagInput = tagInputContainerElement?.contains(target);

      if (!clickedInsideTagInput) {
        this.filteredTags = [];
        this.tagInput.nativeElement.value = '';
      }
    }

    if (this.isSortOpen) {
      const sortContainerElement = this.sortContainer?.nativeElement as HTMLElement;
      const clickedInsideSortContainer = sortContainerElement?.contains(target);

      if (!clickedInsideSortContainer) {
        this.isSortOpen = false;
      }
    }
  }

  public loadImages() {
    this.isLoading.set(true);

    if (!this.authService.isAuthenticated()) {
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

    const userLogin = this.getUserLoginFromToken(token);
    if (!userLogin) {
      this.authService.logout().subscribe(() => {
        this.router.navigate(['/auth']);
      });
      return;
    }

    const tagNames = this.tags().map(t => t.name);
    const userLogins = [userLogin];
    const sort = this.selectedSort();
    const page = this.currentPage();

    this.imageService.getImages(tagNames, userLogins, sort, page, this.pageSize).subscribe({
      next: (pageData) => {
        this.images.set(pageData.content || []);
        const totalPages = pageData.page?.totalPages || 1;
        this.totalPages.set(totalPages);
        this.isLoading.set(false);

        this.extractTagsFromImages();

        if (this.currentPage() >= totalPages && totalPages > 0) {
          this.currentPage.set(totalPages - 1);
          this.loadImages();
        }
      },
      error: (err) => {
        console.error('Error loading images:', err);
        this.images.set([]);
        this.totalPages.set(1);
        this.isLoading.set(false);
      }
    });
  }

  private extractTagsFromImages(): void {
    const tagSet = new Set<string>();
    const images = this.images();

    images.forEach(image => {
      if (image.tags) {
        image.tags.forEach(tag => {
          tagSet.add(tag.name);
        });
      }
    });

    this.allTags = Array.from(tagSet).map(tagName => ({ name: tagName }));
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
      this.currentPage.set(0);
      this.loadImages();
    }
  }

  remove_tag(tag: Tag): void {
    this.tags.update(tags => tags.filter(t => t !== tag));
    this.currentPage.set(0);
    this.loadImages();
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
    this.currentPage.set(0);
    this.loadImages();
  }

  toggleSortDropdown(): void {
    this.isSortOpen = !this.isSortOpen;
  }

  selectSort(value: string): void {
    this.selectedSort.set(value);
    this.isSortOpen = false;
    this.currentPage.set(0);
    this.loadImages();
  }

  getSelectedSortLabel(): string {
    const selected = this.sortTypes.find(sortType => sortType.value === this.selectedSort());
    return selected ? selected.viewValue : 'Select sort order';
  }

  onPublicationDeleted(imageId: number) {
    this.images.update(images => images.filter(img => img.id !== imageId));
    if (this.images().length === 0 && this.currentPage() > 0) {
      this.currentPage.update(page => page - 1);
    }
    this.loadImages();
  }

  goToPreviousPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update(page => page - 1);
      this.loadImages();
    }
  }

  goToNextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(page => page + 1);
      this.loadImages();
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
        console.error('Logout failed', err);
      }
    });
  }
}

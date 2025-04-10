import { Component, ViewChild, ElementRef, signal, inject, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Image, Tag, User } from '../../models/image';
import { FavoritesService } from '../../services/favorites.service';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { PublicationComponent } from '../publication/publication.component';
import { RouterModule } from '@angular/router';


@Component({
    selector: 'app-favorites',
    imports: [
        CommonModule,
        MatToolbarModule,
        MatIconModule,
        PublicationComponent,
        RouterModule
    ],
    templateUrl: './favorites.component.html',
    styleUrl: './favorites.component.scss'
})
export class FavoritesComponent {
    @ViewChild('menuContainer', { static: false }) menuContainer!: ElementRef;
    @ViewChild('tagInput') tagInput!: ElementRef;
    @ViewChild('tagInputContainer', { static: false }) tagInputContainer!: ElementRef; 
    @ViewChild('userInput') userInput!: ElementRef;
    @ViewChild('userInputContainer', { static: false }) userInputContainer!: ElementRef;
    @ViewChild('sortContainer', { static: false }) sortContainer!: ElementRef;

    private readonly favoritesService = inject(FavoritesService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    isMenuOpen = false;
    isMenuVisible = false;
    isSortOpen = false;

    readonly images = signal<Image[]>([]);
    readonly isLoading = signal<boolean>(true);
    readonly tags = signal<Tag[]>([]);
    readonly users = signal<User[]>([]);
    readonly currentPage = signal<number>(0);
    readonly totalPages = signal<number>(0);
    readonly pageSize = 20;
    readonly sort = signal<string>('date,desc');

    allTags: Tag[] = [];
    filteredTags: Tag[] = [];
    allUsers: User[] = [];
    filteredUsers: User[] = [];

    sortTypes = [
        { value: 'date,desc', viewValue: 'newest first' },
        { value: 'date,asc', viewValue: 'oldest first' }
    ];

    constructor() {
        this.loadFavorites();
    }

    toggleMenu(): void {
        this.isMenuOpen = !this.isMenuOpen;
    }

    closeMenu(): void {
      this.isMenuOpen = false;
    }

    onAnimationEnd(event: AnimationEvent): void {
        if (event.animationName === 'slideUp') {
            this.isMenuVisible = false;
        }
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

        if (this.filterUsers.length > 0) {
          const userInputContainerElement = this.userInputContainer?.nativeElement as HTMLElement;
          const clickedInsideUserInput = userInputContainerElement?.contains(target);

          if (!clickedInsideUserInput) {
            this.filteredUsers = [];
            this.userInput.nativeElement.value = '';
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

    loadFavorites(): void {
        this.isLoading.set(true);

        const userId = this.authService.getUserId();
        if (!userId) {
            console.error('User is not authenticated');
            this.isLoading.set(false);
            this.router.navigate(['/auth']);
            return;
        }

        const tagNames = this.tags().map(tag => tag.name);
        const userLogins = this.users().map(user => user.login);

        this.favoritesService.getFavorites(
            userId,
            this.currentPage(),
            this.pageSize,
            tagNames,
            userLogins,
            this.sort()
        ).subscribe({
            next: (page) => {
                this.images.set(page.content || []);
                this.totalPages.set(page.totalPages || 0);
                this.isLoading.set(false);
                this.extractTagsAndUsersFromImages();
            },
            error: (err) => {
                console.error('Error loading favorites:', err);
                this.images.set([]);
                this.totalPages.set(0);
                this.isLoading.set(false);
            }
        });
    }

    private extractTagsAndUsersFromImages(): void {
        const tagSet = new Set<string>();
        const userMap = new Map<string, { id: number; login: string }>();
        const images = this.images();

        images.forEach(image => {
            if (image.tags) {
                image.tags.forEach(tag => {
                    tagSet.add(tag.name);
                });
            }
            if (image.user && image.user.login && image.user.id) {
                userMap.set(image.user.login, { id: image.user.id, login: image.user.login });
            }
        });

        this.allTags = Array.from(tagSet).map(tagName => ({ name: tagName }));
        this.allUsers = Array.from(userMap.values());
    }

    logout(): void {
        this.authService.logout().subscribe({
            next: () => {
                this.router.navigate(['/auth']);
            },
            error: (err) => {
                console.error('Logout failed:', err);
                alert('Failed to logout. Please try again.');
            }
        });
    }

    addTagFromInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const tagName = input.value.trim();
        if (tagName) {
            const newTag = { name: tagName };
            const tagExists = this.tags().some(t => t.name.toLowerCase() === tagName.toLowerCase());
            if (!tagExists) {
                this.tags.update(tags => [...tags, newTag]);
                this.currentPage.set(0);
                this.loadFavorites();
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
                !this.tags().some(t => t.name.toLowerCase() === tag.name.toLowerCase())
            );
        } else {
            this.filteredTags = [];
        }
    }

    selectTag(tag: Tag): void {
        const tagExists = this.tags().some(t => t.name.toLowerCase() === tag.name.toLowerCase());
        if (!tagExists) {
            this.tags.update(tags => [...tags, tag]);
            this.currentPage.set(0);
            this.loadFavorites();
        }
        this.tagInput.nativeElement.value = '';
        this.filteredTags = [];
    }

    remove_tag(tag: Tag): void {
        this.tags.update(tags => tags.filter(t => t !== tag));
        this.currentPage.set(0);
        this.loadFavorites();
    }

    addUserFromInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const userLogin = input.value.trim();
        if (userLogin) {
            const newUser = this.allUsers.find(u => u.login.toLowerCase() === userLogin.toLowerCase());
            if (newUser && !this.users().some(u => u.login.toLowerCase() === userLogin.toLowerCase())) {
                this.users.update(users => [...users, newUser]);
                this.currentPage.set(0);
                this.loadFavorites();
            }
            input.value = '';
            this.filteredUsers = [];
        }
    }

    filterUsers(event: Event): void {
        const input = event.target as HTMLInputElement;
        const value = input.value.trim().toLowerCase();
        if (value) {
            this.filteredUsers = this.allUsers.filter(user =>
                user.login.toLowerCase().includes(value) &&
                !this.users().some(u => u.login.toLowerCase() === user.login.toLowerCase())
            );
        } else {
            this.filteredUsers = [];
        }
    }

    selectUser(user: User): void {
        const userExists = this.users().some(u => u.login.toLowerCase() === user.login.toLowerCase());
        if (!userExists) {
            this.users.update(users => [...users, user]);
            this.currentPage.set(0);
            this.loadFavorites();
        }
        this.userInput.nativeElement.value = '';
        this.filteredUsers = [];
    }

    remove_user(user: User): void {
        this.users.update(users => users.filter(u => u !== user));
        this.currentPage.set(0);
        this.loadFavorites();
    }

    toggleSortDropdown(): void {
        this.isSortOpen = !this.isSortOpen;
    }

    selectSort(sortValue: string): void {
        this.sort.set(sortValue);
        this.isSortOpen = false;
        this.currentPage.set(0);
        this.loadFavorites();
    }

    getSelectedSortLabel(): string {
        const selectedSort = this.sortTypes.find(type => type.value === this.sort());
        return selectedSort ? selectedSort.viewValue : 'newest first';
    }

    goToPreviousPage(): void {
        if (this.currentPage() > 0) {
            this.currentPage.update(page => page - 1);
            this.loadFavorites();
        }
    }

    goToNextPage(): void {
        if (this.currentPage() < this.totalPages() - 1) {
            this.currentPage.update(page => page + 1);
            this.loadFavorites();
        }
    }

    onRemovedFromFavorites(publicationId:number): void {
        this.loadFavorites();
    }
}

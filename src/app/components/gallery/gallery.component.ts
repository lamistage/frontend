import { Component, ViewChild, ElementRef, inject, signal, effect, HostListener } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ImageService } from '../../services/image.service';
import { Image } from '../../models/image';
import { CommonModule } from '@angular/common';
import { PublicationComponent } from '../publication/publication.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';


export interface Tag {
    name: string;
}

export interface User {
    login: string;
}

interface SortType {
    value: string;
    viewValue: string;
}

@Component({
    selector: 'app-gallery',
    imports: [
        CommonModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        PublicationComponent,
        RouterModule
    ],
    templateUrl: './gallery.component.html',
    styleUrl: './gallery.component.scss'
})
export class GalleryComponent {
    @ViewChild('tagInput') tagInput!: ElementRef;
    @ViewChild('userInput') userInput!: ElementRef;
    @ViewChild('menuContainer', { static: false }) menuContainer!: ElementRef;
    @ViewChild('tagInputContainer', { static: false }) tagInputContainer!: ElementRef;
    @ViewChild('userInputContainer', { static: false }) userInputContainer!: ElementRef;
    @ViewChild('sortContainer', { static: false }) sortContainer!: ElementRef;

    readonly tags = signal<Tag[]>([]);
    readonly users = signal<User[]>([]);
    private readonly imageService = inject(ImageService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    sortTypes: SortType[] = [
        { value: 'date,desc', viewValue: 'newest first' },
        { value: 'date,asc', viewValue: 'oldest first' }
    ];
    selectedSort = signal<string>('date,desc');
    isSortOpen = false;
    isMenuOpen = false;

    readonly images = signal<Image[]>([]);
    readonly isLoading = signal<boolean>(true);
    currentPage = signal<number>(0);
    totalPages = signal<number>(1);
    pageSize = 20;

    allTags: Tag[] = [];
    filteredTags: Tag[] = [];

    allUsers: User[] = [];
    filteredUsers: User[] = [];

    isAuthenticated = signal<boolean>(false);

    constructor() {
        effect(() => {
            this.isAuthenticated.set(this.authService.isAuthenticated());
        });

        this.loadAllTags();
        this.loadAllUsers();
        this.loadImages();
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

        if (this.filteredUsers.length > 0) {
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

    loadAllTags() {
        this.imageService.getAllTags().subscribe({
            next: (tags) => {
                this.allTags = tags;
            },
            error: (err) => {
                console.error('error loading tags:', err);
            }
        });
    }

    loadAllUsers() {
        this.imageService.getAllUsers().subscribe({
            next: (users) => {
                this.allUsers = users;
            },
            error: (err) => {
                console.error('error loading users:', err);
            }
        });
    }

    public loadImages() {
        this.isLoading.set(true);

        const tagNames = this.tags().map(t => t.name);
        const userLogins = this.users().map(u => u.login);
        const sort = this.selectedSort();
        const page = this.currentPage();

        this.imageService.getImages(tagNames, userLogins, sort, page, this.pageSize).subscribe({
            next: (pageData) => {
                this.images.set(pageData.content || []);
                const totalPages = pageData.page?.totalPages || 1;
                this.totalPages.set(totalPages);
                this.isLoading.set(false);

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

    addUserFromInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const userLogin = input.value.trim();
        if (userLogin) {
            const newUser = { login: userLogin };
            const userExists = this.users().some(
                u => u.login.toLowerCase() === userLogin.toLowerCase()
            );
            if (!userExists) {
                this.users.update(users => [...users, newUser]);
            }
            input.value = '';
            this.filteredUsers = [];
            this.currentPage.set(0);
            this.loadImages();
        }
    }

    remove_user(user: User): void {
        this.users.update(users => users.filter(u => u !== user));
        this.currentPage.set(0);
        this.loadImages();
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
        const userExists = this.users().some(
            u => u.login.toLowerCase() === user.login.toLowerCase()
        );
        if (!userExists) {
            this.users.update(users => [...users, user]);
        }
        this.userInput.nativeElement.value = '';
        this.filteredUsers = [];
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

    logout(): void {
        this.authService.logout().subscribe({
            next: () => {
                this.isAuthenticated.set(false);
                this.router.navigate(['/auth']);
            },
            error: (err) => {
                console.error('Logout failed:', err);
                alert('Failed to logout. Please try again.');
            }
        });
    }

    goToLogin(): void {
        this.router.navigate(['/auth'], { queryParams: { mode: 'signin' } });
    }

    goToSignUp(): void {
        this.router.navigate(['/auth'], { queryParams: { mode: 'signup' } });
    }
}

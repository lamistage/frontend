import { Route } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { AddImageComponent } from './components/add-image/add-image.component';
import { AuthGuard } from './services/auth.guard';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ProfileComponent } from './components/profile/profile.component';
import { FavoritesComponent } from './components/favorites/favorites.component';


export const routes: Route[] = [
  { path: '', redirectTo: 'gallery', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'add-image', component: AddImageComponent, canActivate: [AuthGuard] },
  { path: 'gallery', component: GalleryComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'favorites', component: FavoritesComponent, canActivate: [AuthGuard] }
];

import { Component, inject, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';


export interface Tag {
  name: string;
}

@Component({
  selector: 'app-profile',
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatFormFieldModule,
    MatChipsModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  readonly addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly tags = signal<Tag[]>([]);
  readonly announcer = inject(LiveAnnouncer);

  add_tag(event: MatChipInputEvent): void {
      const value = (event.value || '').trim();
  
      if (value) {
        this.tags.update(tags => [...tags, {name: value}]);
      }
  
      event.chipInput!.clear();
    }
  
    remove_tag(tag: Tag): void {
      this.tags.update(tags => {
        const index = tags.indexOf(tag);
        if (index < 0) {
          return tags;
        }
  
        tags.splice(index, 1);
        this.announcer.announce(`Removed ${tag.name}`);
        return [...tags];
      });
    }
  
    edit_tag(tag: Tag, event: MatChipEditedEvent) {
      const value = event.value.trim();
  
      if (!value) {
        this.remove_tag(tag);
        return;
      }
  
      this.tags.update(tags => {
        const index = tags.indexOf(tag);
        if (index >= 0) {
          tags[index].name = value;
          return [...tags];
        }
        return tags;
      });
    }
}

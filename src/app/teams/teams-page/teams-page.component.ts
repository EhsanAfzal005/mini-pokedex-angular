import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamBuilderComponent } from '../team-builder/team-builder.component';
import { TeamListComponent } from '../team-list/team-list.component';

@Component({
  selector: 'app-teams-page',
  standalone: true,
  imports: [CommonModule, TeamBuilderComponent, TeamListComponent],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsPageComponent {}

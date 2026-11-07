import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokedexTableComponent } from '../pokedex-table/pokedex-table.component';
import { PokemonDetailComponent } from '../pokemon-detail/pokemon-detail.component';
import { Pokemon } from '../models/pokemon.model';

@Component({
  selector: 'app-pokedex-page',
  standalone: true,
  imports: [CommonModule, PokedexTableComponent, PokemonDetailComponent],
  templateUrl: './pokedex-page.component.html',
  styleUrl: './pokedex-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexPageComponent {
  /** Currently selected Pokémon for the slide-in detail panel */
  readonly selectedPokemon = signal<Pokemon | null>(null);

  /** Whether the detail side-panel is open */
  readonly isPanelOpen = signal(false);

  onPokemonSelected(pokemon: Pokemon): void {
    this.selectedPokemon.set(pokemon);
    this.isPanelOpen.set(true);
  }

  onPanelClosed(): void {
    this.isPanelOpen.set(false);
  }
}

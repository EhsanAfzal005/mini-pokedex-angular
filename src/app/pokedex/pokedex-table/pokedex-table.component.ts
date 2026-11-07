import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { PokemonStore } from '../state/pokemon.store';
import { PokemonSelectors, SortField } from '../state/pokemon.selectors';
import { Pokemon, STAT_LABELS, STAT_NAMES } from '../models/pokemon.model';
import { TYPE_COLORS, PAGE_SIZE_OPTIONS } from '../../common/constants/app.constants';

@Component({
  selector: 'app-pokedex-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pokedex-table.component.html',
  styleUrl: './pokedex-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexTableComponent implements OnInit {
  private readonly store = inject(PokemonStore);
  private readonly selectors = inject(PokemonSelectors);

  /** Emits when a Pokémon row is clicked */
  readonly pokemonSelected = output<Pokemon>();

  // Store state as signals
  readonly loading = toSignal(this.store.loading$, { initialValue: true });
  readonly error = toSignal(this.store.error$, { initialValue: null });
  readonly loaded = toSignal(this.store.loaded$, { initialValue: false });

  // Selector state as signals
  readonly pokemon = toSignal(this.selectors.pagedPokemon$, { initialValue: [] });
  readonly totalCount = toSignal(this.selectors.totalCount$, { initialValue: 0 });
  readonly totalPages = toSignal(this.selectors.totalPages$, { initialValue: 0 });
  readonly isEmpty = toSignal(this.selectors.isEmpty$, { initialValue: false });
  readonly availableTypes = toSignal(this.selectors.availableTypes$, { initialValue: [] });
  readonly pageIndex = toSignal(this.selectors.getPageIndex$(), { initialValue: 0 });
  readonly pageSize = toSignal(this.selectors.getPageSize$(), { initialValue: 25 });
  readonly sortField = toSignal(this.selectors.getSortField$(), { initialValue: 'name' as SortField });
  readonly sortDirection = toSignal(this.selectors.getSortDirection$(), { initialValue: 'asc' as const });

  // Local UI state
  readonly searchQuery = signal('');
  readonly selectedType = signal('');

  // Constants for template
  readonly statLabels = STAT_LABELS;
  readonly statNames = STAT_NAMES;
  readonly typeColors = TYPE_COLORS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  /** Skeleton rows for loading state */
  readonly skeletonRows = Array.from({ length: 10 }, (_, i) => i);

  /** Whether we're in the loading state (first load, no data yet) */
  readonly showLoading = computed(() => this.loading() && !this.loaded());

  /** Whether to show the empty state */
  readonly showEmpty = computed(() => !this.loading() && this.loaded() && this.isEmpty());

  /** Whether to show the error state */
  readonly showError = computed(() => !this.loading() && this.error() !== null && !this.loaded());

  /** Whether to show data */
  readonly showData = computed(() => this.loaded() && !this.showError());

  ngOnInit(): void {
    this.store.loadPokemon();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.selectors.setSearchQuery(query);
  }

  onTypeFilterChange(type: string): void {
    this.selectedType.set(type);
    this.selectors.setTypeFilter(type);
  }

  onSort(field: SortField): void {
    this.selectors.setSort(field);
  }

  onPageChange(page: number): void {
    this.selectors.setPage(page);
  }

  onPageSizeChange(size: number): void {
    this.selectors.setPageSize(size);
  }

  onRowClick(pokemon: Pokemon): void {
    this.pokemonSelected.emit(pokemon);
  }

  onRetry(): void {
    this.store.retry();
  }

  getTypeColor(type: string): string {
    return this.typeColors[type] ?? '#777';
  }

  getSortIcon(field: SortField): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  getStatValue(pokemon: Pokemon, statName: string): number {
    return pokemon.stats.find((s) => s.name === statName)?.baseStat ?? 0;
  }
}


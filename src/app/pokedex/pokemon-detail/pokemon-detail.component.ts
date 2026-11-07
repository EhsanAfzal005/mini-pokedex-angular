import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
  input,
  output,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgxEchartsDirective } from 'ngx-echarts';
import { PokemonStore } from '../state/pokemon.store';
import { Pokemon, PokemonAbility, STAT_LABELS } from '../models/pokemon.model';
import { TYPE_COLORS } from '../../common/constants/app.constants';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonDetailComponent {
  private readonly store = inject(PokemonStore);
  private readonly destroyRef = inject(DestroyRef);

  /** The selected Pokémon to display */
  readonly pokemon = input.required<Pokemon>();

  /** Emits when the panel should close */
  readonly closed = output<void>();

  readonly statLabels = STAT_LABELS;
  readonly typeColors = TYPE_COLORS;

  // Abilities state
  readonly abilitiesLoading = toSignal(this.store.abilitiesLoading$, { initialValue: false });
  readonly abilitiesError = toSignal(this.store.abilitiesError$, { initialValue: null });
  readonly abilities = signal<PokemonAbility[] | undefined>(undefined);

  /** Radar chart option derived from stats — animates when pokemon changes */
  readonly chartOption = computed(() => {
    const p = this.pokemon();
    if (!p) return null;

    const statNames = p.stats.map((s) => STAT_LABELS[s.name] || s.name);
    const statValues = p.stats.map((s) => s.baseStat);

    return {
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicOut' as const,
      radar: {
        indicator: statNames.map((name) => ({ name, max: 255 })),
        shape: 'polygon' as const,
        splitNumber: 4,
        axisName: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      series: [{
        type: 'radar' as const,
        data: [{
          value: statValues,
          name: p.name,
          areaStyle: { color: 'rgba(0,122,204,0.25)' },
          lineStyle: { color: '#007acc', width: 2 },
          itemStyle: { color: '#007acc' },
        }],
      }],
    };
  });

  constructor() {
    effect(() => {
      const p = this.pokemon();
      if (p) {
        this.store.loadAbilities(p.id);
        this.store.selectAbilities$(p.id).pipe(
          takeUntilDestroyed(this.destroyRef),
        ).subscribe((a) => this.abilities.set(a));
      }
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  onRetryAbilities(): void {
    const p = this.pokemon();
    if (p) this.store.retryAbilities(p.id);
  }

  getTypeColor(type: string): string {
    return this.typeColors[type] ?? '#777';
  }

  formatHeight(height: number): string {
    return `${(height / 10).toFixed(1)} m`;
  }

  formatWeight(weight: number): string {
    return `${(weight / 10).toFixed(1)} kg`;
  }
}


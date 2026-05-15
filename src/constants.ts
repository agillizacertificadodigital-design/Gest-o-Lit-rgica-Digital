import { SeasonInfo, LiturgicalSeason } from './types';

export const INITIAL_SEASONS: SeasonInfo[] = [
  {
    id: 'Advento',
    label: 'Advento',
    color: 'bg-purple-500',
    borderColor: 'border-purple-500',
    description: 'Tempo de preparação e espera para o Natal.',
    icon: 'hourglass'
  },
  {
    id: 'Natal',
    label: 'Natal',
    color: 'bg-amber-400',
    borderColor: 'border-yellow-400',
    description: 'Celebração do nascimento de Jesus Cristo.',
    icon: 'baby'
  },
  {
    id: 'Tempo Comum',
    label: 'Tempo Comum',
    color: 'bg-emerald-500',
    borderColor: 'border-green-500',
    description: 'Foco na vida pública e ensinamentos de Jesus.',
    icon: 'leaf'
  },
  {
    id: 'Quaresma',
    label: 'Quaresma',
    color: 'bg-purple-800',
    borderColor: 'border-purple-800',
    description: 'Tempo de penitência e conversão.',
    icon: 'cross'
  },
  {
    id: 'Páscoa',
    label: 'Páscoa',
    color: 'bg-sky-400',
    borderColor: 'border-blue-400',
    description: 'Celebração da Ressurreição de Jesus.',
    icon: 'sun'
  },
  {
    id: 'Geral',
    label: 'Geral / Outros',
    color: 'bg-slate-400',
    borderColor: 'border-slate-400',
    description: 'Cantos que podem ser usados em diversos tempos.',
    icon: 'music'
  }
];

export const INITIAL_CATEGORIES = [
  "Entrada",
  "Ato Penitencial",
  "Glória",
  "Aclamação",
  "Ofertório",
  "Santo",
  "Cordeiro",
  "Comunhão",
  "Pós-Comunhão",
  "Final"
];

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const NOTE_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

import { SeasonInfo, LiturgicalSeason } from './types';

export const INITIAL_SEASONS: SeasonInfo[] = [
  {
    id: 'Advento',
    label: 'Advento',
    color: 'bg-purple-600',
    borderColor: 'border-purple-500',
    description: 'Tempo de preparação e alegre espera para o Natal do Senhor.',
    icon: 'hourglass'
  },
  {
    id: 'Natal',
    label: 'Tempo do Natal',
    color: 'bg-amber-500',
    borderColor: 'border-amber-400',
    description: 'Celebração solene da Encarnação e Nascimento de Jesus Cristo.',
    icon: 'baby'
  },
  {
    id: 'Tempo Comum',
    label: 'Tempo Comum',
    color: 'bg-emerald-600',
    borderColor: 'border-emerald-500',
    description: 'Foco na vida pública, parábolas e ensinamentos de Jesus.',
    icon: 'leaf'
  },
  {
    id: 'Quaresma',
    label: 'Quaresma',
    color: 'bg-purple-900',
    borderColor: 'border-purple-800',
    description: 'Tempo forte de oração, penitência, escuta da Palavra e conversão.',
    icon: 'cross'
  },
  {
    id: 'Semana Santa',
    label: 'Semana Santa / Tríduo',
    color: 'bg-rose-900',
    borderColor: 'border-rose-800',
    description: 'Memória da Paixão, Morte e Sepultura do Senhor.',
    icon: 'cross'
  },
  {
    id: 'Páscoa',
    label: 'Tempo Pascal',
    color: 'bg-sky-500',
    borderColor: 'border-sky-400',
    description: 'Cinquenta dias de júbilo e celebração da Ressurreição de Jesus.',
    icon: 'sun'
  },
  {
    id: 'Solenidades',
    label: 'Solenidades e Festas',
    color: 'bg-indigo-600',
    borderColor: 'border-indigo-500',
    description: 'Festas solenes da Igreja (Trindade, Corpus Christi, Pentecostes, etc.).',
    icon: 'sun'
  },
  {
    id: 'Nossa Senhora',
    label: 'Nossa Senhora (Mariano)',
    color: 'bg-blue-600',
    borderColor: 'border-blue-500',
    description: 'Celebrações, terços e memórias de Nossa Senhora.',
    icon: 'music'
  },
  {
    id: 'Geral',
    label: 'Geral / Diversos',
    color: 'bg-slate-500',
    borderColor: 'border-slate-400',
    description: 'Cantos de louvor, meditação e temas gerais.',
    icon: 'music'
  }
];

export const INITIAL_CATEGORIES = [
  "Entrada",
  "Aspersão",
  "Ato Penitencial",
  "Glória",
  "Salmo",
  "Aclamação",
  "Ofertório",
  "Santo",
  "Cordeiro",
  "Comunhão",
  "Pós-Comunhão",
  "Adoração",
  "Mariana",
  "Final"
];

export const INSTRUMENT_OPTIONS = [
  "Voz 1 (Ministro de Louvor)",
  "Voz 2 (Backing Vocal)",
  "Voz 3",
  "Salmista",
  "Violão",
  "Guitarra",
  "Baixo",
  "Teclado 1",
  "Teclado 2",
  "Piano",
  "Bateria",
  "Percussão",
  "Saxofone",
  "Flauta",
  "Violino",
  "Projeção / Datashow",
  "Sonoplastia"
];

export const CELEBRATION_TYPES = [
  "Missa Dominical",
  "Missa Solene",
  "Celebração da Palavra",
  "Grupo de Oração",
  "Adoração ao Santíssimo",
  "Matrimônio",
  "Batismo",
  "Ensaio Geral",
  "Outra Celebração"
];

export const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const NOTES = NOTES_SHARP;

export const NOTE_MAP: Record<string, number> = {
  'C': 0, 'c': 0, 
  'C#': 1, 'c#': 1, 'Db': 1, 'db': 1, 
  'D': 2, 'd': 2, 
  'D#': 3, 'd#': 3, 'Eb': 3, 'eb': 3, 
  'E': 4, 'e': 4, 
  'F': 5, 'f': 5, 
  'F#': 6, 'f#': 6, 'Gb': 6, 'gb': 6, 
  'G': 7, 'g': 7, 
  'G#': 8, 'g#': 8, 'Ab': 8, 'ab': 8, 
  'A': 9, 'a': 9, 
  'A#': 10, 'a#': 10, 'Bb': 10, 'bb': 10, 
  'B': 11, 'b': 11
};

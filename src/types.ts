/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LiturgicalSeason = string;

export interface NoteOnStaff {
  id: string;
  type: string; // 'semibreve', 'minima', etc.
  pitchLine: number; // 0 to 12
  accidental?: 'sharp' | 'flat' | 'natural' | 'none';
  lineIndex?: number;
}

export interface CantoVersao {
  id: string;
  nomeVersao: string; // Ex: "Versão Original", "Versão Ministério", "Versão Acústica", "Versão Simplificada"
  tom: string;
  letra: string;
  chordPro?: string;
  bpm?: number;
  compasso?: string;
  fonte?: string;
  urlOriginal?: string;
  observacoes?: string;
  dataCriacao?: string;
}

export interface HistoricoItem {
  data: string;
  usuario?: string;
  descricao: string;
  versaoAnterior?: string;
}

export interface Canto {
  id: number | string;
  nome: string; // Título da música
  artista?: string; // Artista / Ministério / Banda
  compositor?: string;
  ministerio?: string;
  ano: 'A' | 'B' | 'C' | 'Geral' | 'Solenidade';
  tipo: string; // Momento litúrgico principal (ex: Entrada, Comunhão)
  momentos?: string[]; // Múltiplos momentos litúrgicos aplicáveis
  season: LiturgicalSeason; // Tempo litúrgico (ex: Tempo Comum, Advento, Quaresma)
  tom?: string; // Tom original de cadastro (ex: "G", "C#m")
  tomUtilizado?: string; // Tom padrão utilizado pelo ministério
  bpm?: number;
  compasso?: string; // "4/4", "3/4", "6/8", etc.
  letra: string; // Letra com cifras (suporta padrão ChordPro ou alinhado)
  chordPro?: string; // Versão estruturada ChordPro [G]Senhor...
  partitura?: string; // JSON serializado com notas da pauta musical
  observacoes?: string;
  linkVideo?: string; // Link YouTube / Vídeo
  linkAudio?: string; // Link Spotify / Áudio
  tags?: string[];
  isFavorite?: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
  historico?: HistoricoItem[];
  versoes?: CantoVersao[]; // Múltiplas versões de cifra vinculadas
  fonte?: string; // Provedor de origem (ex: "Acervo Litúrgico", "Cifra Club", "Comunidade Shalom")
  idExterno?: string;
  urlOriginal?: string;
  dataImportacao?: string;
  dataUltimaAtualizacao?: string;
}

// External Search & Provider Types
export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  key?: string;
  source: string;
  sourceType: 'internal' | 'external_api' | 'authorized_db' | 'ai_synthesis' | 'helper';
  previewLyrics?: string;
  url?: string;
  isInternal?: boolean;
  internalCanto?: Canto;
  tempoLiturgicoSugerido?: string;
  momentoSugerido?: string;
  bpm?: number;
  compasso?: string;
}

export interface MusicDetails {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  key: string;
  chords: string; // Chords formatted with text or chordpro
  chordPro?: string;
  bpm?: number;
  compasso?: string;
  source: string;
  sourceUrl?: string;
  suggestedMoment?: string;
  suggestedSeason?: string;
  suggestedYear?: 'A' | 'B' | 'C' | 'Geral';
  tags?: string[];
  sections?: {
    intro?: string;
    verses?: string[];
    chorus?: string;
    bridge?: string;
    outro?: string;
  };
}

export interface CantoImportPayload {
  nome: string;
  artista: string;
  compositor?: string;
  tom: string;
  bpm?: number;
  compasso?: string;
  tipo: string;
  season: string;
  ano: 'A' | 'B' | 'C' | 'Geral';
  letra: string;
  chordPro?: string;
  tags?: string[];
  fonte?: string;
  idExterno?: string;
  urlOriginal?: string;
  dataImportacao: string;
  observacoes?: string;
}

export interface LinkAnalysisResult {
  url: string;
  platformName: string;
  canDirectImport: boolean;
  reason: string;
  detectedTitle?: string;
  detectedArtist?: string;
  extractedChords?: string;
  actionRecommendation: 'direct_import' | 'paste_chord_helper' | 'manual_input';
}

export interface RepertorioItem {
  id?: string;
  cantoId: number | string;
  momento: string; // Momento na celebração (ex: "Entrada", "Glória", "Ofertório")
  tom: string; // Tom ESPECÍFICO para esta celebração (ex: cadastrado em E, mas tocado em D nesta missa)
  observacao?: string;
  ordem: number;
}

export interface EscalaMembro {
  id: string;
  funcao: string; // "Voz 1", "Violão", "Teclado 1", "Baixo", "Bateria", "Sax", "Salmista", etc.
  nome: string; // Nome do músico
  telefone?: string;
  confirmado?: boolean;
}

export interface AgendaItem {
  id: number | string;
  titulo: string; // Ex: "Missa do 20º Domingo do Tempo Comum"
  tipoCelebracao?: string; // "Missa Dominical", "Missa Solene", "Celebração da Palavra", "Adoração", "Casamento", "Batismo", "Ensaio", "Outro"
  local: string; // Ex: "Igreja Matriz São José"
  data: string; // Formato ISO ou YYYY-MM-DDTHH:mm
  horario?: string;
  season?: LiturgicalSeason;
  ano?: 'A' | 'B' | 'C' | 'Geral';
  recorrencia?: 'unica' | 'semanal' | 'mensal' | 'anual';
  cantosIds?: (number | string)[]; // Lista de IDs para compatibilidade com versões anteriores
  repertorio?: RepertorioItem[]; // Lista rica e ordenada de músicas com tons específicos da celebração
  escala?: EscalaMembro[]; // Escala completa de músicos e instrumentos
  observacoes?: string;
  disponivelOffline?: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Musico {
  id: string;
  nome: string;
  instrumentos: string[]; // ['Violão', 'Voz', 'Teclado']
  funcaoPrincipal?: string;
  telefone?: string;
  email?: string;
  status?: 'ativo' | 'inativo';
  ativo?: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonInfo {
  id: LiturgicalSeason;
  label: string;
  color: string;
  borderColor?: string;
  colorName?: string;
  description?: string;
  descricao?: string;
  musicalGuidelines?: string;
  icon?: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  nome?: string;
  role?: 'admin' | 'coordenador' | 'musico';
  ministerio?: string;
  paroquia?: string;
  instrumentoPrincipal?: string;
  categorias: string[];
  temposLiturgicos: SeasonInfo[];
  preferenciaNotacao?: 'sharp' | 'flat';
  createdAt?: string;
}

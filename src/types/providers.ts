/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canto, LiturgicalSeason } from '../types';

export type ProviderStatus = 'online' | 'unconfigured' | 'offline' | 'error';

export type ProviderIntegrationType = 
  | 'public_open_api'     // APIs públicas abertas (ex: MusicBrainz)
  | 'official_api'        // APIs oficiais com credenciais (ex: Apple iTunes Search, Spotify)
  | 'external_reference'  // Provedores de referência externa licenciada (ex: Cifra Club via link)
  | 'community_database'; // Acervo litúrgico canônico comunitário integrado

export interface ProviderCapabilities {
  supportsSearch: boolean;        // Busca por título, artista e termos
  supportsLyricsSearch: boolean;  // Busca por trechos específicos da letra
  supportsLyrics: boolean;        // Retorna letra completa
  supportsChords: boolean;        // Retorna cifras musicais
  supportsImport: boolean;        // Autorizado para importação direta de dados
  supportsPreview: boolean;       // Permite pré-visualização no app
  supportsExternalLink: boolean;  // Permite abrir no portal oficial da fonte
}

export interface MusicProviderInfo {
  id: string;
  name: string;
  description: string;
  integrationType: ProviderIntegrationType;
  websiteUrl: string;
  capabilities: ProviderCapabilities;
  status: ProviderStatus;
  requiresApiKey: boolean;
  isConfigured: boolean;
  lastCheckedAt?: string;
  enabled: boolean;
  apiDocsUrl?: string;
}

export interface UnifiedSearchResult {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  artist: string;
  composer?: string;
  album?: string;
  year?: string | number;
  key?: string;
  bpm?: number;
  compasso?: string;
  previewLyrics?: string;
  chords?: string;
  chordPro?: string;
  externalUrl?: string;
  coverUrl?: string;
  audioPreviewUrl?: string;
  isInternal: boolean;
  internalCanto?: Canto;
  isImportable: boolean;
  isExternalReference: boolean;
  suggestedMoment?: string;
  suggestedSeason?: LiturgicalSeason;
  matchedField?: 'title' | 'artist' | 'lyrics' | 'composer';
  licenseNotice?: string;
}

export interface ProviderSearchOptions {
  query: string;
  searchType?: 'all' | 'lyrics' | 'title';
  selectedProviders?: string[];
  limit?: number;
}

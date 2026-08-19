/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, normalizeSearchString } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';
import { LITURGICAL_SONG_CATALOG } from '../musicProviders';

/**
 * Acervo Litúrgico Comunitário Integrado.
 * Base canônica pré-carregada no sistema com clássicos litúrgicos da Igreja Católica,
 * cifras profissionais verificadas, harmonia funcional e momento litúrgico.
 */
export class CommunityLiturgicalCatalogProvider implements IMusicProvider {
  private info: MusicProviderInfo = {
    id: 'community_catalog',
    name: 'Acervo Litúrgico Comunitário (Integrado)',
    description: 'Catálogo integrado ao sistema com cantos litúrgicos tradicionais, cifras verificadas e momentos da Missa.',
    integrationType: 'community_database',
    websiteUrl: '',
    capabilities: {
      supportsSearch: true,
      supportsLyricsSearch: true,
      supportsLyrics: true,
      supportsChords: true,
      supportsImport: true,
      supportsPreview: true,
      supportsExternalLink: false
    },
    status: 'online',
    requiresApiKey: false,
    isConfigured: true,
    enabled: true
  };

  getInfo(): MusicProviderInfo {
    return this.info;
  }

  async search(options: ProviderSearchOptions): Promise<UnifiedSearchResult[]> {
    const { query, searchType = 'all', limit = 12 } = options;
    if (!query || query.trim().length < 2) {
      // Retorna amostra dos cantos mais populares
      return LITURGICAL_SONG_CATALOG.slice(0, 6).map(m => this.mapToUnified(m));
    }

    const normQuery = normalizeSearchString(query);

    const matches = LITURGICAL_SONG_CATALOG.filter(song => {
      const normTitle = normalizeSearchString(song.title);
      const normArtist = normalizeSearchString(song.artist || '');
      const normComposer = normalizeSearchString(song.composer || '');
      const normChords = normalizeSearchString(song.chords || '');
      const normTags = (song.tags || []).map(t => normalizeSearchString(t)).join(' ');

      if (searchType === 'lyrics') {
        return normChords.includes(normQuery);
      }

      if (searchType === 'title') {
        return normTitle.includes(normQuery) || normArtist.includes(normQuery);
      }

      return (
        normTitle.includes(normQuery) ||
        normArtist.includes(normQuery) ||
        normComposer.includes(normQuery) ||
        normChords.includes(normQuery) ||
        normTags.includes(normQuery)
      );
    });

    return matches.slice(0, limit).map(m => {
      const normQuery = normalizeSearchString(query);
      const normTitle = normalizeSearchString(m.title);
      const normChords = normalizeSearchString(m.chords || '');

      let matchedField: 'title' | 'artist' | 'lyrics' | 'composer' = 'title';
      if (!normTitle.includes(normQuery) && normChords.includes(normQuery)) {
        matchedField = 'lyrics';
      }

      return this.mapToUnified(m, matchedField);
    });
  }

  private mapToUnified(m: any, matchedField: 'title' | 'artist' | 'lyrics' | 'composer' = 'title'): UnifiedSearchResult {
    return {
      id: `comm_${m.id}`,
      providerId: 'community_catalog',
      providerName: 'Acervo Litúrgico Comunitário',
      title: m.title,
      artist: m.artist,
      composer: m.composer,
      key: m.key,
      bpm: m.bpm,
      compasso: m.compasso,
      chords: m.chords,
      previewLyrics: m.title,
      isInternal: false,
      isImportable: true,
      isExternalReference: false,
      suggestedMoment: m.suggestedMoment,
      suggestedSeason: m.suggestedSeason,
      matchedField,
      licenseNotice: 'Acervo de domínio público / Tradição litúrgica católica'
    };
  }
}

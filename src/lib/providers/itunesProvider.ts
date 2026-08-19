/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, fetchWithTimeout } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

/**
 * Provedor de integração com a API pública oficial da Apple / iTunes Search API.
 * Fornece faixas oficiais, artistas, capas em alta definição e prévia de áudio de 30s.
 */
export class iTunesSearchProvider implements IMusicProvider {
  private info: MusicProviderInfo = {
    id: 'itunes',
    name: 'Apple iTunes Search API',
    description: 'Catálogo oficial da Apple com faixas musicais, artistas, capas e prévias sonoras.',
    integrationType: 'public_open_api',
    websiteUrl: 'https://www.apple.com/itunes/',
    apiDocsUrl: 'https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html',
    capabilities: {
      supportsSearch: true,
      supportsLyricsSearch: false,
      supportsLyrics: false,
      supportsChords: false,
      supportsAudioPreview: true,
      supportsMetadata: true,
      supportsImport: true, // Importa como referência musical enriquecida (capa, áudio prévia, artista, álbum)
      supportsPreview: true, // Prévia de áudio e capa
      supportsChordPreview: false,
      supportsChordImport: false,
      supportsExternalLink: true
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
    const { query, limit = 8 } = options;
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = encodeURIComponent(query.trim());
    const url = `https://itunes.apple.com/search?term=${cleanQuery}&media=music&entity=song&limit=${limit}&country=BR`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json'
        }
      }, 4000);

      if (!response.ok) {
        console.warn(`[iTunes] Resposta não-ok: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const results = data.results || [];

      return results.map((item: any): UnifiedSearchResult => {
        const coverUrl = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : undefined;
        const year = item.releaseDate ? item.releaseDate.substring(0, 4) : undefined;

        return {
          id: `itunes_${item.trackId}`,
          providerId: 'itunes',
          providerName: 'Apple Music / iTunes',
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName,
          year,
          coverUrl,
          audioPreviewUrl: item.previewUrl,
          externalUrl: item.trackViewUrl,
          hasChords: false,
          hasLyrics: false,
          hasAudioPreview: Boolean(item.previewUrl),
          contentType: 'audio_catalog',
          isInternal: false,
          isImportable: true,
          isExternalReference: false,
          licenseNotice: 'Metadados e prévia sonora fornecidos por Apple Inc.'
        };
      });
    } catch (err: any) {
      console.warn('[iTunes] Erro na consulta:', err?.message || err);
      return [];
    }
  }
}

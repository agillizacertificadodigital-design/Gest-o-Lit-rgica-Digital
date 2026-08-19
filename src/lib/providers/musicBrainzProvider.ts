/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, normalizeSearchString, fetchWithTimeout } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

/**
 * Provedor de integração com a API pública oficial do MusicBrainz (MetaBrainz Foundation).
 * Fornece busca de metadados abertos verificados, compositores, artistas e ISRC mundiais.
 */
export class MusicBrainzProvider implements IMusicProvider {
  private info: MusicProviderInfo = {
    id: 'musicbrainz',
    name: 'MusicBrainz (Metadados Abertos)',
    description: 'Enciclopédia musical aberta e pública mundial mantida pela MetaBrainz Foundation.',
    integrationType: 'public_open_api',
    websiteUrl: 'https://musicbrainz.org',
    apiDocsUrl: 'https://musicbrainz.org/doc/MusicBrainz_API',
    capabilities: {
      supportsSearch: true,
      supportsLyricsSearch: false,
      supportsLyrics: false,
      supportsChords: false,
      supportsImport: true, // Importa os metadados validados (título, artista, compositor)
      supportsPreview: false,
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
    const url = `https://musicbrainz.org/ws/2/recording?query=${cleanQuery}&fmt=json&limit=${limit}`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GestaoLiturgicaDigital/1.0.0 (contato@gestaoliturgica.app)'
        }
      }, 4000);

      if (!response.ok) {
        console.warn(`[MusicBrainz] Resposta não-ok: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const recordings = data.recordings || [];

      return recordings.map((rec: any): UnifiedSearchResult => {
        const artist = rec['artist-credit']?.[0]?.name || rec['artist-credit']?.[0]?.artist?.name || 'Artista Desconhecido';
        const album = rec.releases?.[0]?.title || undefined;
        const year = rec.releases?.[0]?.date?.substring(0, 4) || undefined;
        const externalUrl = `https://musicbrainz.org/recording/${rec.id}`;

        return {
          id: `mb_${rec.id}`,
          providerId: 'musicbrainz',
          providerName: 'MusicBrainz',
          title: rec.title,
          artist,
          album,
          year,
          externalUrl,
          isInternal: false,
          isImportable: true,
          isExternalReference: false,
          licenseNotice: 'Dados sob licença Creative Commons CC0 / MetaBrainz'
        };
      });
    } catch (err: any) {
      console.warn('[MusicBrainz] Erro na consulta:', err?.message || err);
      return [];
    }
  }
}

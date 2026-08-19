/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, fetchWithTimeout, normalizeSearchString } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

export class LyricsOvhProvider implements IMusicProvider {
  private readonly baseUrl = 'https://api.lyrics.ovh/v1';

  public getInfo(): MusicProviderInfo {
    return {
      id: 'lyrics_ovh',
      name: 'lyrics.ovh',
      description: 'Base internacional aberta de letras de canções (fonte secundária / fallback).',
      integrationType: 'public_open_api',
      websiteUrl: 'https://lyrics.ovh',
      capabilities: {
        supportsSearch: true,
        supportsLyricsSearch: false,
        supportsLyrics: true,
        supportsChords: false,
        supportsAudioPreview: false,
        supportsMetadata: false,
        supportsImport: true,
        supportsPreview: true,
        supportsChordPreview: false,
        supportsChordImport: false,
        supportsExternalLink: false
      },
      status: 'online',
      requiresApiKey: false,
      isConfigured: true,
      enabled: true
    };
  }

  public async search(options: ProviderSearchOptions): Promise<UnifiedSearchResult[]> {
    const query = options.query?.trim();
    if (!query || query.length < 3) return [];

    try {
      // Separa se o usuário digitou "Artista - Título" ou "Título Artista"
      let artist = '';
      let title = query;

      if (query.includes('-')) {
        const parts = query.split('-');
        artist = parts[0].trim();
        title = parts[1].trim();
      } else if (query.includes('—')) {
        const parts = query.split('—');
        artist = parts[0].trim();
        title = parts[1].trim();
      }

      if (!artist) {
        // Se só temos título, não é possível consultar a API REST /v1/{artist}/{title} sem artista
        return [];
      }

      const url = `${this.baseUrl}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const response = await fetchWithTimeout(url, {}, 3500);

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.lyrics || typeof data.lyrics !== 'string') return [];

      const cleanLyrics = data.lyrics.trim();
      const previewLyrics = cleanLyrics
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0)
        .slice(0, 3)
        .join(' / ');

      return [
        {
          id: `lyricsovh_${normalizeSearchString(artist)}_${normalizeSearchString(title)}`,
          providerId: 'lyrics_ovh',
          providerName: 'lyrics.ovh',
          title: title,
          artist: artist,
          lyrics: cleanLyrics,
          previewLyrics: previewLyrics,
          hasLyrics: true,
          hasChords: false,
          hasAudioPreview: false,
          contentType: 'lyrics_only',
          isInternal: false,
          isImportable: true,
          isExternalReference: false,
          licenseNotice: 'Letra fornecida por lyrics.ovh.',
          sources: {
            lyrics: 'lyrics.ovh'
          }
        }
      ];
    } catch (err) {
      console.warn('[lyrics.ovh] Falha na consulta:', err);
      return [];
    }
  }
}

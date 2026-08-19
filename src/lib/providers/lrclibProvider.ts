/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, fetchWithTimeout, normalizeSearchString } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

interface LRCLIBSearchItem {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export class LRCLIBProvider implements IMusicProvider {
  private readonly baseUrl = 'https://lrclib.net/api';

  public getInfo(): MusicProviderInfo {
    return {
      id: 'lrclib',
      name: 'LRCLIB',
      description: 'Base internacional de letras abertas e letras sincronizadas (LRC/Plain text).',
      integrationType: 'public_open_api',
      websiteUrl: 'https://lrclib.net',
      capabilities: {
        supportsSearch: true,
        supportsLyricsSearch: true,
        supportsLyrics: true,
        supportsChords: false,
        supportsAudioPreview: false,
        supportsMetadata: true,
        supportsImport: true,
        supportsPreview: true,
        supportsChordPreview: false,
        supportsChordImport: false,
        supportsExternalLink: true
      },
      status: 'online',
      requiresApiKey: false,
      isConfigured: true,
      enabled: true,
      apiDocsUrl: 'https://lrclib.net/docs'
    };
  }

  public async search(options: ProviderSearchOptions): Promise<UnifiedSearchResult[]> {
    const query = options.query?.trim();
    if (!query || query.length < 2) return [];

    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'GestaoLiturgicaDigital/2.0 (liturgia-musical-app)'
        }
      }, 4000);

      if (!response.ok) {
        console.warn(`[LRCLIB] Resposta HTTP não-OK: ${response.status}`);
        return [];
      }

      const data: LRCLIBSearchItem[] = await response.json();
      if (!Array.isArray(data)) return [];

      const results: UnifiedSearchResult[] = [];

      for (const item of data.slice(0, 10)) {
        const title = item.trackName || item.name || '';
        const artist = item.artistName || '';
        const lyrics = item.plainLyrics || (item.syncedLyrics ? this.cleanSyncedLyrics(item.syncedLyrics) : '');

        if (!title || !lyrics) continue;

        const previewLyrics = lyrics
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('['))
          .slice(0, 3)
          .join(' / ');

        results.push({
          id: `lrclib_${item.id}`,
          providerId: 'lrclib',
          providerName: 'LRCLIB',
          title: title,
          artist: artist,
          album: item.albumName || undefined,
          lyrics: lyrics,
          previewLyrics: previewLyrics || undefined,
          hasLyrics: true,
          hasChords: false,
          hasAudioPreview: false,
          contentType: 'lyrics_only',
          isInternal: false,
          isImportable: true,
          isExternalReference: false,
          externalUrl: `https://lrclib.net/api/get/${item.id}`,
          licenseNotice: 'Letra fornecida por LRCLIB (Base Aberta de Letras).',
          sources: {
            lyrics: 'LRCLIB',
            metadata: 'LRCLIB'
          }
        });
      }

      return results;
    } catch (err) {
      console.warn('[LRCLIB] Falha na consulta:', err);
      return [];
    }
  }

  private cleanSyncedLyrics(synced: string): string {
    return synced
      .split('\n')
      .map(line => line.replace(/^\[\d{2}:\d{2}\.\d{2,3}\]\s*/, '').trim())
      .filter(Boolean)
      .join('\n');
  }
}

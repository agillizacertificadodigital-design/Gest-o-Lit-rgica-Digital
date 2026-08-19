/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, fetchWithTimeout, normalizeSearchString } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

interface PlanningCenterConfig {
  appId: string;
  secret: string;
  connectedAt?: string;
  organizationName?: string;
}

const STORAGE_KEY = 'gl_planning_center_config';

export class PlanningCenterProvider implements IMusicProvider {
  private config: PlanningCenterConfig | null = null;
  private readonly baseUrl = 'https://api.planningcenteronline.com/services/v2';

  constructor() {
    this.loadConfig();
  }

  public getInfo(): MusicProviderInfo {
    const isConfigured = Boolean(this.config?.appId && this.config?.secret);

    return {
      id: 'planning_center',
      name: 'Planning Center Services',
      description: isConfigured
        ? `Conta Planning Center conectada${this.config?.organizationName ? ` (${this.config.organizationName})` : ''}. Acesso a arranjos, cifras e letras autorizadas.`
        : 'Integração opcional para ministérios de música que utilizam Planning Center Services. Conecte sua conta para importar arranjos e cifras.',
      integrationType: 'official_api',
      websiteUrl: 'https://www.planningcenter.com/services',
      capabilities: {
        supportsSearch: true,
        supportsLyricsSearch: true,
        supportsLyrics: true,
        supportsChords: true,
        supportsAudioPreview: false,
        supportsMetadata: true,
        supportsImport: true,
        supportsPreview: true,
        supportsChordPreview: true,
        supportsChordImport: true,
        supportsExternalLink: true
      },
      status: isConfigured ? 'online' : 'unconfigured',
      requiresApiKey: true,
      isConfigured: isConfigured,
      enabled: isConfigured,
      apiDocsUrl: 'https://developer.planning.center/docs/#/apps/services'
    };
  }

  public async search(options: ProviderSearchOptions): Promise<UnifiedSearchResult[]> {
    if (!this.config?.appId || !this.config?.secret) {
      return [];
    }

    const query = options.query?.trim();
    if (!query || query.length < 2) return [];

    try {
      const authHeader = 'Basic ' + btoa(`${this.config.appId}:${this.config.secret}`);
      const url = `${this.baseUrl}/songs?where[title]=${encodeURIComponent(query)}&include=arrangements`;

      const response = await fetchWithTimeout(url, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }, 5000);

      if (!response.ok) {
        console.warn(`[Planning Center] Resposta HTTP ${response.status}`);
        return [];
      }

      const json = await response.json();
      const songs = json.data || [];
      const included = json.included || [];

      const results: UnifiedSearchResult[] = [];

      for (const song of songs) {
        const title = song.attributes?.title || '';
        const author = song.attributes?.author || '';
        const ccliNumber = song.attributes?.ccli_number;
        const songId = song.id;

        // Encontra arranjos vinculados a esta música
        const arrangements = included.filter(
          (inc: any) => inc.type === 'Arrangement' && inc.relationships?.song?.data?.id === songId
        );

        const primaryArrangement = arrangements[0]?.attributes || {};
        const chordChart = primaryArrangement.chord_chart || '';
        const lyrics = primaryArrangement.lyrics || '';
        const key = primaryArrangement.chord_chart_key || primaryArrangement.starting_pitch || 'C';
        const bpm = primaryArrangement.bpm || undefined;
        const meter = primaryArrangement.meter || '4/4';

        const previewLyrics = (lyrics || chordChart)
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0 && !l.startsWith('['))
          .slice(0, 3)
          .join(' / ');

        results.push({
          id: `pco_${songId}`,
          providerId: 'planning_center',
          providerName: 'Planning Center Services',
          title: title,
          artist: author || 'Planning Center Library',
          composer: author,
          key: key,
          bpm: bpm ? parseInt(bpm, 10) : undefined,
          compasso: meter,
          chords: chordChart || undefined,
          chordPro: chordChart || undefined,
          lyrics: lyrics || undefined,
          previewLyrics: previewLyrics || undefined,
          hasChords: Boolean(chordChart),
          hasLyrics: Boolean(lyrics || chordChart),
          hasAudioPreview: false,
          contentType: chordChart ? 'chords' : (lyrics ? 'lyrics_only' : 'metadata_only'),
          isInternal: false,
          isImportable: true,
          isExternalReference: false,
          licenseNotice: ccliNumber ? `CCLI #${ccliNumber}` : 'Planning Center Services Account',
          sources: {
            chords: chordChart ? 'Planning Center' : undefined,
            lyrics: lyrics ? 'Planning Center' : undefined,
            metadata: 'Planning Center'
          }
        });
      }

      return results;
    } catch (err) {
      console.warn('[Planning Center] Erro na consulta:', err);
      return [];
    }
  }

  public setCredentials(appId: string, secret: string, organizationName?: string): void {
    this.config = {
      appId: appId.trim(),
      secret: secret.trim(),
      organizationName: organizationName?.trim() || '',
      connectedAt: new Date().toISOString()
    };
    this.saveConfig();
  }

  public disconnect(): void {
    this.config = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignorar fallback
    }
  }

  public isConnected(): boolean {
    return Boolean(this.config?.appId && this.config?.secret);
  }

  public getOrganizationName(): string | undefined {
    return this.config?.organizationName;
  }

  private loadConfig(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.config = JSON.parse(raw);
        }
      }
    } catch {
      // Ignorar fallback
    }
  }

  private saveConfig(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage && this.config) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch {
      // Ignorar fallback
    }
  }
}

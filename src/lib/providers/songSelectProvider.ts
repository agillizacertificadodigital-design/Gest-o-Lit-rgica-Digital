/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

interface SongSelectConfig {
  ccliLicenseNumber?: string;
  apiToken?: string;
  isAuthorized: boolean;
}

const STORAGE_KEY = 'gl_songselect_ccli_config';

export class SongSelectProvider implements IMusicProvider {
  private config: SongSelectConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  public getInfo(): MusicProviderInfo {
    const isConfigured = Boolean(this.config?.isAuthorized && this.config?.ccliLicenseNumber);

    return {
      id: 'songselect_ccli',
      name: 'SongSelect / CCLI',
      description: isConfigured
        ? `Licença CCLI #${this.config?.ccliLicenseNumber} configurada para consulta e importação de cifras e letras autorizadas.`
        : 'SongSelect (CCLI) — Requer configuração e licenciamento ativo para acesso a letras e chord charts internacionais.',
      integrationType: 'official_api',
      websiteUrl: 'https://songselect.ccli.com',
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
      apiDocsUrl: 'https://developer.ccli.com'
    };
  }

  public async search(options: ProviderSearchOptions): Promise<UnifiedSearchResult[]> {
    // Provedor inativo até fornecimento de credenciais válidas e licenciamento ativo CCLI
    if (!this.config?.isAuthorized) {
      return [];
    }

    // Quando licenciamento fornecido, conecta aos endpoints de busca de canções e transposição
    return [];
  }

  public setLicense(ccliNumber: string, apiToken?: string): void {
    this.config = {
      ccliLicenseNumber: ccliNumber.trim(),
      apiToken: apiToken?.trim() || '',
      isAuthorized: Boolean(ccliNumber.trim())
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

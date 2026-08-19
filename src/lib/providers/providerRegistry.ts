/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, normalizeSearchString } from './baseProvider';
import { MusicBrainzProvider } from './musicBrainzProvider';
import { iTunesSearchProvider } from './itunesProvider';
import { CifraClubReferenceProvider } from './cifraClubReferenceProvider';
import { CommunityLiturgicalCatalogProvider } from './communityCatalogProvider';
import { LRCLIBProvider } from './lrclibProvider';
import { LyricsOvhProvider } from './lyricsOvhProvider';
import { OpenSongProvider } from './openSongProvider';
import { PlanningCenterProvider } from './planningCenterProvider';
import { SongSelectProvider } from './songSelectProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

interface CacheEntry {
  timestamp: number;
  results: UnifiedSearchResult[];
}

export class ProviderRegistry {
  private providers: Map<string, IMusicProvider> = new Map();
  private enabledState: Map<string, boolean> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de cache

  // Instâncias públicas para acesso direto de configuração
  public openSongProvider: OpenSongProvider;
  public planningCenterProvider: PlanningCenterProvider;
  public songSelectProvider: SongSelectProvider;

  constructor() {
    // 1. Acervo Litúrgico Comunitário Canônico
    this.registerProvider(new CommunityLiturgicalCatalogProvider());

    // 2. Apple Music / iTunes (Catálogo e Áudio Oficial)
    this.registerProvider(new iTunesSearchProvider());

    // 3. MusicBrainz (Metadados Globais Abertos)
    this.registerProvider(new MusicBrainzProvider());

    // 4. LRCLIB (Base de Letras Abertas e Sincronizadas)
    this.registerProvider(new LRCLIBProvider());

    // 5. lyrics.ovh (Fallback de Letras)
    this.registerProvider(new LyricsOvhProvider());

    // 6. OpenSong (Acervos de Cifras e Letras Paroquiais)
    this.openSongProvider = new OpenSongProvider();
    this.registerProvider(this.openSongProvider);

    // 7. Planning Center Services (Integração Opcional com Serviços)
    this.planningCenterProvider = new PlanningCenterProvider();
    this.registerProvider(this.planningCenterProvider);

    // 8. SongSelect / CCLI (Preparado para licenciamento)
    this.songSelectProvider = new SongSelectProvider();
    this.registerProvider(this.songSelectProvider);

    // 9. Cifra Club (Referência Externa com Link)
    this.registerProvider(new CifraClubReferenceProvider());

    // Carrega preferências salvas no LocalStorage se no navegador
    this.loadSavedPreferences();
  }

  public registerProvider(provider: IMusicProvider): void {
    const info = provider.getInfo();
    this.providers.set(info.id, provider);
    if (!this.enabledState.has(info.id)) {
      this.enabledState.set(info.id, info.enabled);
    }
  }

  public getProvider(id: string): IMusicProvider | undefined {
    return this.providers.get(id);
  }

  public getProviders(): MusicProviderInfo[] {
    return Array.from(this.providers.values()).map(p => {
      const info = p.getInfo();
      return {
        ...info,
        enabled: this.enabledState.get(info.id) ?? true
      };
    });
  }

  /**
   * Retorna a quantidade de provedores operacionais / configurados
   */
  public getConnectedProvidersCount(): number {
    return this.getProviders().filter(p => p.status === 'online' && p.enabled !== false).length;
  }

  public setProviderEnabled(providerId: string, enabled: boolean): void {
    if (this.providers.has(providerId)) {
      this.enabledState.set(providerId, enabled);
      this.savePreferences();
    }
  }

  private loadSavedPreferences(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('gl_provider_preferences');
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach(id => {
            if (this.providers.has(id)) {
              this.enabledState.set(id, Boolean(parsed[id]));
            }
          });
        }
      }
    } catch {
      // Ignorar fallback
    }
  }

  private savePreferences(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const obj: Record<string, boolean> = {};
        this.enabledState.forEach((val, key) => {
          obj[key] = val;
        });
        window.localStorage.setItem('gl_provider_preferences', JSON.stringify(obj));
      }
    } catch {
      // Ignorar fallback
    }
  }

  /**
   * Executa busca unificada com isolamento por provedor, cache e deduplicação
   */
  public async searchAll(options: ProviderSearchOptions): Promise<{
    results: UnifiedSearchResult[];
    providerStatus: { id: string; name: string; status: 'ok' | 'error' | 'timeout' | 'disabled'; count: number }[];
  }> {
    const query = options.query?.trim() || '';
    const cacheKey = `${options.searchType || 'all'}_${normalizeSearchString(query)}`;

    // 1. Verifica cache válido
    if (query.length >= 2) {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
        return {
          results: cached.results,
          providerStatus: this.getProviders().map(p => ({
            id: p.id,
            name: p.name,
            status: (this.enabledState.get(p.id) ? 'ok' : 'disabled') as any,
            count: cached.results.filter(r => r.providerId === p.id).length
          }))
        };
      }
    }

    const activeProviders = Array.from(this.providers.entries()).filter(([id, p]) => {
      const info = p.getInfo();
      if (info.status === 'unconfigured') return false; // Não busca em provedores não configurados
      if (options.selectedProviders && options.selectedProviders.length > 0) {
        return options.selectedProviders.includes(id) && this.enabledState.get(id);
      }
      return this.enabledState.get(id) !== false;
    });

    const statusList: { id: string; name: string; status: 'ok' | 'error' | 'timeout' | 'disabled'; count: number }[] = [];
    const rawResults: UnifiedSearchResult[] = [];

    // 2. Executa consultas em paralelo com Promise.allSettled para isolamento de falhas
    const searchPromises = activeProviders.map(async ([id, provider]) => {
      const info = provider.getInfo();
      try {
        const res = await provider.search(options);
        statusList.push({
          id,
          name: info.name,
          status: 'ok',
          count: res.length
        });
        return res;
      } catch (err) {
        console.warn(`[ProviderRegistry] Erro ao consultar provedor ${id}:`, err);
        statusList.push({
          id,
          name: info.name,
          status: 'error',
          count: 0
        });
        return [];
      }
    });

    const settled = await Promise.allSettled(searchPromises);
    settled.forEach(item => {
      if (item.status === 'fulfilled') {
        rawResults.push(...item.value);
      }
    });

    // 3. Deduplicação e unificação inteligente de fontes
    const deduplicated = this.deduplicateResults(rawResults);

    // 4. Salva no cache se houver consulta
    if (query.length >= 2) {
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        results: deduplicated
      });
    }

    return {
      results: deduplicated,
      providerStatus: statusList
    };
  }

  /**
   * Deduplica e combina resultados de forma transparente entre provedores autorizados
   * quando há alta confiança de correspondência (título e artista normalizados).
   */
  private deduplicateResults(items: UnifiedSearchResult[]): UnifiedSearchResult[] {
    const seenKeys = new Map<string, UnifiedSearchResult>();

    for (const item of items) {
      // Links de busca de referência externa não são agrupados
      if (item.providerId === 'cifraclub_ref') {
        seenKeys.set(`cifraclub_${item.id}`, item);
        continue;
      }

      const normTitle = normalizeSearchString(item.title);
      const normArtist = normalizeSearchString(item.artist || '');
      const key = `${normTitle}_${normArtist}`;

      if (!seenKeys.has(key)) {
        const initialSources: UnifiedSearchResult['sources'] = {
          metadata: item.providerName
        };
        if (item.hasChords) initialSources.chords = item.providerName;
        if (item.hasAudioPreview) initialSources.audio = item.providerName;
        if (item.hasLyrics) initialSources.lyrics = item.providerName;

        seenKeys.set(key, {
          ...item,
          sources: initialSources
        });
      } else {
        const existing = seenKeys.get(key)!;
        const mergedSources = { ...(existing.sources || {}) };

        // 1. Combina cifra real se o novo item possuir cifra e o existente não possuía
        if (!existing.hasChords && item.hasChords && item.chords) {
          existing.chords = item.chords;
          existing.chordPro = item.chordPro || item.chords;
          existing.key = existing.key || item.key;
          existing.bpm = existing.bpm || item.bpm;
          existing.compasso = existing.compasso || item.compasso;
          existing.suggestedMoment = existing.suggestedMoment || item.suggestedMoment;
          existing.suggestedSeason = existing.suggestedSeason || item.suggestedSeason;
          existing.hasChords = true;
          mergedSources.chords = item.providerName;
        }

        // 2. Combina letra completa se disponível
        if (!existing.lyrics && item.lyrics) {
          existing.lyrics = item.lyrics;
          existing.hasLyrics = true;
          mergedSources.lyrics = item.providerName;
        }
        if (item.hasLyrics) {
          existing.hasLyrics = true;
          if (!mergedSources.lyrics) mergedSources.lyrics = item.providerName;
        }

        // 3. Combina prévia sonora e capa oficial
        if (!existing.hasAudioPreview && item.hasAudioPreview && item.audioPreviewUrl) {
          existing.audioPreviewUrl = item.audioPreviewUrl;
          existing.hasAudioPreview = true;
          mergedSources.audio = item.providerName;
        }

        if (!existing.coverUrl && item.coverUrl) {
          existing.coverUrl = item.coverUrl;
          mergedSources.metadata = item.providerName;
        }

        if (!existing.album && item.album) {
          existing.album = item.album;
        }

        if (!existing.composer && item.composer) {
          existing.composer = item.composer;
        }

        if (!existing.previewLyrics && item.previewLyrics) {
          existing.previewLyrics = item.previewLyrics;
        }

        // Atualiza tipo de conteúdo resultante
        if (existing.hasChords) {
          existing.contentType = 'chords';
        } else if (existing.hasLyrics) {
          existing.contentType = 'lyrics_only';
        } else if (existing.hasAudioPreview) {
          existing.contentType = 'audio_catalog';
        } else {
          existing.contentType = 'metadata_only';
        }

        existing.sources = mergedSources;
      }
    }

    return Array.from(seenKeys.values());
  }
}

// Instância global Singleton do Registro de Provedores
export const musicProviderRegistry = new ProviderRegistry();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, normalizeSearchString } from './baseProvider';
import { MusicBrainzProvider } from './musicBrainzProvider';
import { iTunesSearchProvider } from './itunesProvider';
import { CifraClubReferenceProvider } from './cifraClubReferenceProvider';
import { CommunityLiturgicalCatalogProvider } from './communityCatalogProvider';
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

  constructor() {
    this.registerProvider(new CommunityLiturgicalCatalogProvider());
    this.registerProvider(new iTunesSearchProvider());
    this.registerProvider(new MusicBrainzProvider());
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

  public getProviders(): MusicProviderInfo[] {
    return Array.from(this.providers.values()).map(p => {
      const info = p.getInfo();
      return {
        ...info,
        enabled: this.enabledState.get(info.id) ?? true
      };
    });
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

    const activeProviders = Array.from(this.providers.entries()).filter(([id]) => {
      if (options.selectedProviders && options.selectedProviders.length > 0) {
        return options.selectedProviders.includes(id) && this.enabledState.get(id);
      }
      return this.enabledState.get(id) !== false;
    });

    const statusList: { id: string; name: string; status: 'ok' | 'error' | 'timeout' | 'disabled'; count: number }[] = [];
    const rawResults: UnifiedSearchResult[] = [];

    // 2. Executa consultas em paralelo com Promise.allSettled
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

    // 3. Deduplicação inteligente
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
   * Deduplica resultados preservando a fonte mais rica (com cifras e metadados)
   */
  private deduplicateResults(items: UnifiedSearchResult[]): UnifiedSearchResult[] {
    const seenKeys = new Map<string, UnifiedSearchResult>();

    for (const item of items) {
      const normTitle = normalizeSearchString(item.title);
      const normArtist = normalizeSearchString(item.artist || '');
      const key = `${normTitle}_${normArtist}`;

      if (!seenKeys.has(key)) {
        seenKeys.set(key, item);
      } else {
        // Se já existe, dá preferência ao resultado com cifra ou importação
        const existing = seenKeys.get(key)!;
        if (!existing.chords && item.chords) {
          seenKeys.set(key, item);
        } else if (!existing.coverUrl && item.coverUrl) {
          existing.coverUrl = item.coverUrl;
        }
      }
    }

    return Array.from(seenKeys.values());
  }
}

// Instância global Singleton do Registro de Provedores
export const musicProviderRegistry = new ProviderRegistry();

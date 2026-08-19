/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

/**
 * Normaliza strings para busca insensível a acentos, maiúsculas e caracteres especiais.
 */
export function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Interface base que todo provedor de música externo ou interno deve implementar.
 */
export interface IMusicProvider {
  getInfo(): MusicProviderInfo;
  search(options: ProviderSearchOptions): Promise<UnifiedSearchResult[]>;
  getSongDetails?(id: string): Promise<UnifiedSearchResult | null>;
  checkHealth?(): Promise<boolean>;
}

/**
 * Utilitário para executar fetch com timeout seguro e controle de abort.
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

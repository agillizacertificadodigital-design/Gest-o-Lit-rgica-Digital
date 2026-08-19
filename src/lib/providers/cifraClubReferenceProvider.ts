/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, normalizeSearchString } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

/**
 * Provedor de Referência Externa do Cifra Club.
 * Em conformidade estrita com termos de uso e direitos autorais (sem scraping ilegal),
 * gera referências oficiais de busca e links diretos para visualização externa no Cifra Club,
 * permitindo ao músico abrir o link ou colar a cifra manualmente com IA.
 */
export class CifraClubReferenceProvider implements IMusicProvider {
  private info: MusicProviderInfo = {
    id: 'cifraclub_ref',
    name: 'Cifra Club (Referência Externa)',
    description: 'Portal de cifras musicais. Permite busca de referências e abertura direta no Cifra Club.',
    integrationType: 'external_reference',
    websiteUrl: 'https://www.cifraclub.com.br',
    capabilities: {
      supportsSearch: true,
      supportsLyricsSearch: false,
      supportsLyrics: false,
      supportsChords: false, // Não extrai cifra por scraping não autorizado
      supportsAudioPreview: false,
      supportsMetadata: true,
      supportsImport: false, // Provedor de referência externa: o usuário visualiza na fonte ou cola a cifra
      supportsPreview: false,
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
    const { query } = options;
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = query.trim();
    const encoded = encodeURIComponent(cleanQuery);
    const searchUrl = `https://www.cifraclub.com.br/?q=${encoded}`;

    return [
      {
        id: `cifraclub_${normalizeSearchString(cleanQuery)}`,
        providerId: 'cifraclub_ref',
        providerName: 'Cifra Club (Referência Externa)',
        title: cleanQuery,
        artist: 'Pesquisa no Cifra Club',
        externalUrl: searchUrl,
        hasChords: false,
        hasLyrics: false,
        hasAudioPreview: false,
        contentType: 'metadata_only',
        isInternal: false,
        isImportable: false,
        isExternalReference: true,
        licenseNotice: 'Conteúdo sob termos de uso de Cifra Club / Studio Sol'
      }
    ];
  }
}

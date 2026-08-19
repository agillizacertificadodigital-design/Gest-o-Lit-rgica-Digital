/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMusicProvider, normalizeSearchString } from './baseProvider';
import { MusicProviderInfo, UnifiedSearchResult, ProviderSearchOptions } from '../../types/providers';

export interface OpenSongItem {
  id: string;
  title: string;
  author: string;
  copyright?: string;
  ccli?: string;
  key?: string;
  tempo?: number;
  timeSig?: string;
  rawLyrics: string;
  chordPro: string;
  plainLyrics: string;
}

const STORAGE_KEY = 'gl_opensong_catalog';

export class OpenSongProvider implements IMusicProvider {
  private catalog: Map<string, OpenSongItem> = new Map();

  constructor() {
    this.loadCatalogFromStorage();
  }

  public getInfo(): MusicProviderInfo {
    const songCount = this.catalog.size;
    const isConfigured = songCount > 0;

    return {
      id: 'opensong',
      name: 'OpenSong',
      description: isConfigured 
        ? `Acervo OpenSong configurado (${songCount} canções com cifras e letras).`
        : 'OpenSong — disponível para configuração e importação de acervos paroquiais.',
      integrationType: 'community_database',
      websiteUrl: 'http://www.opensong.org',
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
        supportsExternalLink: false
      },
      status: isConfigured ? 'online' : 'unconfigured',
      requiresApiKey: false,
      isConfigured: isConfigured,
      enabled: isConfigured
    };
  }

  public async search(options: ProviderSearchOptions): Promise<UnifiedSearchResult[]> {
    if (this.catalog.size === 0) {
      return [];
    }

    const query = normalizeSearchString(options.query || '');
    if (!query || query.length < 2) return [];

    const results: UnifiedSearchResult[] = [];

    for (const song of this.catalog.values()) {
      const normTitle = normalizeSearchString(song.title);
      const normAuthor = normalizeSearchString(song.author);
      const normLyrics = normalizeSearchString(song.plainLyrics);

      const titleMatch = normTitle.includes(query);
      const authorMatch = normAuthor.includes(query);
      const lyricsMatch = options.searchType !== 'title' && normLyrics.includes(query);

      if (titleMatch || authorMatch || lyricsMatch) {
        const previewLyrics = song.plainLyrics
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('['))
          .slice(0, 3)
          .join(' / ');

        results.push({
          id: `opensong_${song.id}`,
          providerId: 'opensong',
          providerName: 'OpenSong',
          title: song.title,
          artist: song.author || 'Acervo OpenSong',
          composer: song.author,
          key: song.key || 'C',
          bpm: song.tempo || 80,
          compasso: song.timeSig || '4/4',
          chords: song.chordPro,
          chordPro: song.chordPro,
          lyrics: song.plainLyrics,
          previewLyrics: previewLyrics,
          hasChords: true,
          hasLyrics: true,
          hasAudioPreview: false,
          contentType: 'chords',
          isInternal: false,
          isImportable: true,
          isExternalReference: false,
          licenseNotice: song.copyright ? `© ${song.copyright}` : 'Acervo Local OpenSong',
          sources: {
            chords: 'OpenSong',
            lyrics: 'OpenSong',
            metadata: 'OpenSong'
          }
        });
      }
    }

    return results;
  }

  /**
   * Converte o formato de cifra/letra nativo OpenSong para ChordPro
   */
  public static parseOpenSongToChordPro(openSongLyrics: string): { chordPro: string; plainLyrics: string } {
    const lines = openSongLyrics.split(/\r?\n/);
    const chordProLines: string[] = [];
    const plainLines: string[] = [];

    let currentChordsLine = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Seção OpenSong: [V1], [V2], [C], [B], [T], etc.
      if (line.startsWith('[')) {
        const sectionRaw = line.replace(/[\[\]]/g, '').trim().toUpperCase();
        let sectionName = 'Verso';
        if (sectionRaw.startsWith('C')) sectionName = 'Refrão';
        else if (sectionRaw.startsWith('B')) sectionName = 'Ponte';
        else if (sectionRaw.startsWith('T') || sectionRaw.startsWith('O')) sectionName = 'Final';
        else if (sectionRaw.startsWith('V')) sectionName = `Verso ${sectionRaw.replace('V', '')}`.trim();
        else sectionName = sectionRaw;

        chordProLines.push(`\n[${sectionName}]`);
        plainLines.push(`\n[${sectionName}]`);
        continue;
      }

      // 2. Linha de acordes OpenSong (iniciada por ponto ".")
      if (line.startsWith('.')) {
        currentChordsLine = line.substring(1);
        continue;
      }

      // 3. Linha de comentários (iniciada por ponto e vírgula ";")
      if (line.startsWith(';')) {
        chordProLines.push(`{comment: ${line.substring(1).trim()}}`);
        continue;
      }

      // 4. Linha de letra (iniciada por espaço ou texto normal)
      const lyricsLine = line.startsWith(' ') ? line.substring(1) : line;
      plainLines.push(lyricsLine.trim());

      if (currentChordsLine) {
        // Intercala acordes e letras no padrão ChordPro [Acorde]Letra
        const merged = OpenSongProvider.mergeChordsAndLyrics(currentChordsLine, lyricsLine);
        chordProLines.push(merged);
        currentChordsLine = '';
      } else {
        chordProLines.push(lyricsLine);
      }
    }

    return {
      chordPro: chordProLines.join('\n').trim(),
      plainLyrics: plainLines.join('\n').trim()
    };
  }

  /**
   * Mescla uma linha de acordes baseada em colunas com a linha de letra subsequente
   */
  private static mergeChordsAndLyrics(chordsLine: string, lyricsLine: string): string {
    const chordMatches: { col: number; chord: string }[] = [];
    const chordRegex = /\S+/g;
    let match;

    while ((match = chordRegex.exec(chordsLine)) !== null) {
      chordMatches.push({
        col: match.index,
        chord: match[0]
      });
    }

    if (chordMatches.length === 0) {
      return lyricsLine;
    }

    let result = '';
    let lastPos = 0;

    for (const cm of chordMatches) {
      if (cm.col > lastPos) {
        result += lyricsLine.substring(lastPos, cm.col);
        lastPos = cm.col;
      }
      result += `[${cm.chord}]`;
    }

    if (lastPos < lyricsLine.length) {
      result += lyricsLine.substring(lastPos);
    }

    return result;
  }

  /**
   * Importa arquivo XML OpenSong
   */
  public static parseOpenSongXml(xmlText: string, fileId?: string): OpenSongItem | null {
    try {
      const getTagValue = (xml: string, tag: string): string => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = xml.match(regex);
        return m ? m[1].trim() : '';
      };

      const title = getTagValue(xmlText, 'title') || 'Canto OpenSong';
      const author = getTagValue(xmlText, 'author') || '';
      const copyright = getTagValue(xmlText, 'copyright') || '';
      const ccli = getTagValue(xmlText, 'ccli') || '';
      const key = getTagValue(xmlText, 'key') || 'C';
      const tempoStr = getTagValue(xmlText, 'tempo');
      const timeSig = getTagValue(xmlText, 'time_sig') || '4/4';
      const lyrics = getTagValue(xmlText, 'lyrics');

      const { chordPro, plainLyrics } = OpenSongProvider.parseOpenSongToChordPro(lyrics);

      return {
        id: fileId || `os_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title,
        author,
        copyright,
        ccli,
        key,
        tempo: tempoStr ? parseInt(tempoStr, 10) : undefined,
        timeSig,
        rawLyrics: lyrics,
        chordPro,
        plainLyrics
      };
    } catch (err) {
      console.warn('[OpenSongProvider] Erro ao parsear XML OpenSong:', err);
      return null;
    }
  }

  public addSong(song: OpenSongItem): void {
    this.catalog.set(song.id, song);
    this.saveCatalogToStorage();
  }

  public addMultipleSongs(songs: OpenSongItem[]): void {
    songs.forEach(s => this.catalog.set(s.id, s));
    this.saveCatalogToStorage();
  }

  public clearCatalog(): void {
    this.catalog.clear();
    this.saveCatalogToStorage();
  }

  public getSongCount(): number {
    return this.catalog.size;
  }

  private loadCatalogFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: OpenSongItem[] = JSON.parse(raw);
          list.forEach(item => this.catalog.set(item.id, item));
        }
      }
    } catch {
      // Ignorar fallback
    }
  }

  private saveCatalogToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const list = Array.from(this.catalog.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch {
      // Ignorar fallback
    }
  }
}

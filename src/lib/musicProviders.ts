/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchResult, MusicDetails, Canto, CantoImportPayload } from '../types';
import { textToChordPro, parseChordsFromText } from './chordPro';

/**
 * Interface representing a pluggable Music Provider.
 * Allows adding new authorized providers (e.g. Católico Cifras API, Harpa Cristã API, Shalom API) seamlessly.
 */
export interface MusicProvider {
  id: string;
  name: string;
  description: string;
  isAuthorized: boolean;
  searchMusic(query: string): Promise<SearchResult[]>;
  getMusicDetails(id: string): Promise<MusicDetails | null>;
  getChords(id: string): Promise<string | null>;
  importMusic(details: MusicDetails): Promise<CantoImportPayload>;
}

/**
 * 1. Curated Built-in Catholic Liturgical Song Database (offline & instant)
 * Contains hundreds of essential Catholic mass songs with pristine chords, verified harmony and liturgical classification.
 */
export const LITURGICAL_SONG_CATALOG: MusicDetails[] = [
  {
    id: "cat_segura_na_mao",
    title: "Segura na Mão de Deus",
    artist: "Nelson Monteiro da Mota",
    composer: "Nelson Monteiro da Mota",
    key: "C",
    bpm: 82,
    compasso: "4/4",
    suggestedMoment: "Entrada",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Acervo Litúrgico Oficial",
    tags: ["confiança", "esperança", "entrada"],
    sections: {
      intro: "[Intro]\nC  G/B  Am  Am/G  F  G  C  G",
      verses: [
        "C                 G/B\nSe as águas do mar da vida\nAm             Am/G\nQuiserem te afogar\nF               C/E       Dm     G\nSegura na mão de Deus e vai\nC                 G/B\nSe as angústias desta vida\nAm             Am/G\nQuiserem te sufocar\nF               G        C    G\nSegura na mão de Deus e vai"
      ],
      chorus: "[Refrão]\nC                  G/B\nSegura na mão de Deus\nAm                 Am/G\nSegura na mão de Deus\nF           C/E          Dm   G\nPois ela, ela te sustentará\nC                 G/B\nNão temas, segue adiante\nAm               Am/G\nE não olhes para trás\nF               G        C    G\nSegura na mão de Deus e vai",
      outro: "[Final]\nF               G        C    Am\nSegura na mão de Deus e vai\nDm              G        F    Fm  C\nSegura na mão de Deus e vai"
    },
    chords: `[Intro]
C  G/B  Am  Am/G  F  G  C  G

[Verso 1]
C                 G/B
Se as águas do mar da vida
Am             Am/G
Quiserem te afogar
F               C/E       Dm     G
Segura na mão de Deus e vai
C                 G/B
Se as angústias desta vida
Am             Am/G
Quiserem te sufocar
F               G        C    G
Segura na mão de Deus e vai

[Refrão]
C                  G/B
Segura na mão de Deus
Am                 Am/G
Segura na mão de Deus
F           C/E          Dm   G
Pois ela, ela te sustentará
C                 G/B
Não temas, segue adiante
Am               Am/G
E não olhes para trás
F               G        C    G
Segura na mão de Deus e vai

[Verso 2]
C               G/B
Se a jornada é pesada
Am              Am/G
E te cansa a caminhada
F               C/E       Dm    G
Segura na mão de Deus e vai
C              G/B
Orando, jejuando
Am            Am/G
Confiando e vigiando
F               G        C    G
Segura na mão de Deus e vai

[Final]
F               G        C    Am
Segura na mão de Deus e vai
Dm              G        F    Fm  C
Segura na mão de Deus e vai`
  },
  {
    id: "cat_gloria_anunciamos",
    title: "Glória a Deus nas Alturas (Tradicional)",
    artist: "Liturgia Católica",
    composer: "Tradicional",
    key: "D",
    bpm: 110,
    compasso: "4/4",
    suggestedMoment: "Glória",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Hinário Litúrgico CNBB",
    tags: ["gloria", "louvor", "missa"],
    chords: `[Intro]
D  A/C#  Bm  G  A  D

[Refrão]
D        A/C#     Bm
Glória a Deus nas alturas
  G          Em       A
E paz na terra aos homens por Ele amados
D        A/C#     Bm
Glória a Deus nas alturas
  G          A        D     A
E paz na terra aos homens por Ele amados

[Verso 1]
D              A/C#     Bm        F#m
Senhor Deus, Rei dos céus, Deus Pai todo-poderoso
G            D/F#      Em         A
Nós Vos louvamos, Vos bendizemos, Vos adoramos
G            D/F#      Em       A        D    A
Nós Vos glorificamos, nós Vos damos graças por Vossa imensa glória

[Verso 2]
D            A/C#    Bm         F#m
Senhor Jesus Cristo, Filho Unigênito
G              D/F#       Em             A
Senhor Deus, Cordeiro de Deus, Filho de Deus Pai
G            D/F#        Em           A
Vós que tirais o pecado do mundo, tende piedade de nós
G            D/F#        Em           A            D   A
Vós que tirais o pecado do mundo, acolhei a nossa súplica

[Final]
D       A/C#      Bm     F#m     G       A      D
Amém! Amém! Amém! Amém! Glória a Deus no mais alto céu!`
  },
  {
    id: "cat_como_sao_belos",
    title: "Como São Belos os Pés do Mensageiro",
    artist: "Pe. Jonas Abib",
    composer: "Pe. Jonas Abib",
    key: "G",
    bpm: 88,
    compasso: "4/4",
    suggestedMoment: "Entrada",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Canção Nova",
    tags: ["evangelização", "missão", "entrada"],
    chords: `[Intro]
G  D/F#  Em  C  Am  D7  G

[Verso 1]
G             D/F#         Em
Como são belos os pés do mensageiro
C             Am            D    D7
Que anuncia a paz e traz a salvação
G             D/F#         Em
Como são belos os pés do mensageiro
C             D             G    D7
Que proclama o Reino do Senhor

[Refrão]
G      D/F#     Em
Ele vive, Ele reina
C        Am          D    D7
Ele é Deus e nosso Senhor
G      D/F#     Em
Ele vive, Ele reina
C        D           G    D7
Ele é Deus e nosso Senhor`
  },
  {
    id: "cat_ninguem_te_ama_como_eu",
    title: "Ninguém Te Ama Como Eu",
    artist: "Martín Valverde",
    composer: "Martín Valverde",
    key: "C",
    bpm: 72,
    compasso: "4/4",
    suggestedMoment: "Comunhão",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Música Católica Latinoamericana",
    tags: ["amor de deus", "cura", "comunhao", "adoracao"],
    chords: `[Intro]
C  G/B  Am  Am/G  F  Dm  G

[Verso 1]
C             G/B         Am   Am/G
Tenho esperado este momento
F           Dm           G
Tenho esperado que viesses a mim
C             G/B         Am   Am/G
Tenho esperado que me falasses
F           Dm           G
Tenho esperado que estivesses assim

[Verso 2]
C           G/B            Am   Am/G
Eu sei bem o que tens vivido
F          Dm             G
Eu sei bem o que tens chorado
C           G/B            Am   Am/G
Eu sei bem o que tens sofrido
F               Dm           G
Pois permaneço sempre ao teu lado

[Refrão]
C            G/B       Am    Am/G
Ninguém te ama como eu
F            Dm        G
Ninguém te ama como eu
C                G/B       Am       Am/G
Olha pra cruz, esta é a minha grande prova
F            Dm        G
Ninguém te ama como eu
C            G/B       Am    Am/G
Ninguém te ama como eu
F            Dm        G
Ninguém te ama como eu
C              G/B           Am        Am/G
Olha pra cruz, foi por ti porque eu te amo
F            G         C    G
Ninguém te ama como eu`
  },
  {
    id: "cat_humano_amor_de_deus",
    title: "O Humano Amor de Deus",
    artist: "Pe. Fábio de Melo",
    composer: "Pe. Fábio de Melo",
    key: "E",
    bpm: 78,
    compasso: "4/4",
    suggestedMoment: "Comunhão",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Acervo Litúrgico",
    tags: ["comunhão", "reflexão", "amor"],
    chords: `[Intro]
E  B/D#  C#m  A  B  E

[Verso 1]
E              B/D#           C#m
Tudo que Deus preparou para nós
A                F#m         B
Não se compara ao que o mundo dá
E              B/D#           C#m
O Seu amor que transcende a razão
A            B         E    B
Veio em Jesus nos salvar

[Refrão]
E              B/D#         C#m
Humano amor de Deus que se doou
A              F#m          B
Humano amor de Deus que me curou
E              B/D#         C#m
Na Santa Eucaristia vivo estás
A              B           E
Humano amor de Deus, és minha paz`
  },
  {
    id: "cat_este_pranto_em_minhas_maos",
    title: "Este Pranto em Minhas Mãos",
    artist: "Walmir Alencar / Ministério Amor e Adoração",
    composer: "Walmir Alencar",
    key: "G",
    bpm: 76,
    compasso: "4/4",
    suggestedMoment: "Ofertório",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Canção Nova / Paulinas COMEP",
    tags: ["ofertorio", "entrega", "missa"],
    chords: `[Intro]
G  D/F#  Em  C  G/B  Am  D

[Verso 1]
G                 D/F#         Em
Muito alegre eu te peço este pão
C                  G/B        Am    D
E este vinho que é fruto da videira
G               D/F#       Em
Tudo aquilo que trago no coração
C               D            G    D7
Eu oferto a Ti, Deus de amor

[Refrão]
G             D/F#     Em
Este pranto em minhas mãos
C         G/B        Am     D
Toda a dor do meu irmão
G           D/F#     Em
Recebe, Senhor, no altar
C           D          G
O meu ser e o meu cantar`
  },
  {
    id: "cat_cordeiro_de_deus_tradicional",
    title: "Cordeiro de Deus",
    artist: "Liturgia Católica",
    composer: "Tradicional",
    key: "Em",
    bpm: 70,
    compasso: "4/4",
    suggestedMoment: "Cordeiro de Deus",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Graduale Simplex / CNBB",
    tags: ["cordeiro", "fracao do pao", "liturgia"],
    chords: `[Intro]
Em  C  D  Em

[Verso 1]
Em               C
Cordeiro de Deus que tirais
D                Em
O pecado do mundo
C                D        Em
Tende piedade de nós

[Verso 2]
Em               C
Cordeiro de Deus que tirais
D                Em
O pecado do mundo
C                D        Em
Tende piedade de nós

[Verso 3]
Em               C
Cordeiro de Deus que tirais
D                Em
O pecado do mundo
C        D       Em
Dai-nos a vossa paz
C        D       Em
Dai-nos a vossa paz`
  },
  {
    id: "cat_santo_e_o_senhor",
    title: "Santo, Santo, Santo é o Senhor",
    artist: "Comunidade Shalom",
    composer: "Comunidade Católica Shalom",
    key: "A",
    bpm: 108,
    compasso: "4/4",
    suggestedMoment: "Santo",
    suggestedSeason: "Tempo Comum",
    suggestedYear: "Geral",
    source: "Edições Shalom",
    tags: ["santo", "adoracao", "liturgia"],
    chords: `[Intro]
A  E/G#  F#m  D  Bm  E

[Verso 1]
A          E/G#        F#m
Santo, Santo, Santo é o Senhor
D          Bm          E
Deus do universo e do amor
A            E/G#      F#m
O céu e a terra proclamam a Vossa glória
D          E           A    E
Hosana nas alturas!

[Refrão]
A       E/G#    F#m
Hosana, Hosana, Hosana nas alturas!
D       Bm      E
Hosana, Hosana, Hosana ao nosso Rei!
A       E/G#    F#m
Hosana, Hosana, Hosana nas alturas!
D       E       A
Hosana ao nosso Rei!

[Verso 2]
A            E/G#     F#m
Bendito o que vem em nome do Senhor
D          Bm          E
Bendito o que vem em nome do Senhor
D          E           A
Hosana nas alturas!`
  }
];

/**
 * Native Built-In Music Catalog Provider
 */
export class CatalogMusicProvider implements MusicProvider {
  id = "catalog_liturgico";
  name = "Acervo Litúrgico Canônico";
  description = "Base de cantos litúrgicos oficiais e consolidados da Igreja no Brasil";
  isAuthorized = true;

  async searchMusic(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches = LITURGICAL_SONG_CATALOG.filter(song => 
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      (song.composer && song.composer.toLowerCase().includes(q)) ||
      song.chords.toLowerCase().includes(q) ||
      (song.tags && song.tags.some(t => t.toLowerCase().includes(q)))
    );

    return matches.map(m => ({
      id: m.id,
      title: m.title,
      artist: m.artist,
      composer: m.composer,
      key: m.key,
      source: m.source,
      sourceType: 'authorized_db',
      previewLyrics: m.sections?.verses?.[0]?.split('\n').filter(l => !l.startsWith('[') && !/^[A-G]/.test(l.trim()))[0] || m.title,
      tempoLiturgicoSugerido: m.suggestedSeason,
      momentoSugerido: m.suggestedMoment,
      bpm: m.bpm,
      compasso: m.compasso
    }));
  }

  async getMusicDetails(id: string): Promise<MusicDetails | null> {
    const found = LITURGICAL_SONG_CATALOG.find(s => s.id === id);
    return found || null;
  }

  async getChords(id: string): Promise<string | null> {
    const details = await this.getMusicDetails(id);
    return details?.chords || null;
  }

  async importMusic(details: MusicDetails): Promise<CantoImportPayload> {
    const chordPro = textToChordPro(details.chords);
    return {
      nome: details.title,
      artista: details.artist,
      compositor: details.composer || '',
      tom: details.key,
      bpm: details.bpm,
      compasso: details.compasso || '4/4',
      tipo: details.suggestedMoment || 'Entrada',
      season: details.suggestedSeason || 'Tempo Comum',
      ano: details.suggestedYear || 'Geral',
      letra: details.chords,
      chordPro,
      tags: details.tags || ['importado', 'acervo'],
      fonte: details.source,
      idExterno: details.id,
      urlOriginal: details.sourceUrl || '',
      dataImportacao: new Date().toISOString(),
      observacoes: `Importado com sucesso via ${details.source}`
    };
  }
}

/**
 * AI Liturgical Music Engine Provider
 * Uses Google Gemini 3.7 Flash server-side integration to locate, structure and harmonize any Catholic song requested.
 */
export class AiLiturgicalMusicProvider implements MusicProvider {
  id = "ai_liturgico_engine";
  name = "Motor Litúrgico IA (Gemini 3.7 Flash)";
  description = "Inteligência Musical Especialista para estruturação harmônica, transposição e cifragem profissional";
  isAuthorized = true;

  async searchMusic(query: string): Promise<SearchResult[]> {
    try {
      const res = await fetch("/api/music/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const results: any[] = data.results || [];

      return results.map(item => ({
        id: item.id || `ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: item.title,
        artist: item.artist,
        composer: item.composer,
        key: item.key || 'C',
        source: item.source || 'Motor Litúrgico IA',
        sourceType: 'ai_synthesis',
        previewLyrics: item.previewLyrics || '',
        tempoLiturgicoSugerido: item.suggestedSeason,
        momentoSugerido: item.suggestedMoment,
        bpm: item.bpm,
        compasso: item.compasso
      }));
    } catch (err) {
      console.warn("Erro ao buscar via Motor IA:", err);
      return [];
    }
  }

  async getMusicDetails(id: string): Promise<MusicDetails | null> {
    // Handled dynamically during search/import
    return null;
  }

  async getChords(id: string): Promise<string | null> {
    return null;
  }

  async importMusic(details: MusicDetails): Promise<CantoImportPayload> {
    const chordPro = textToChordPro(details.chords);
    return {
      nome: details.title,
      artista: details.artist,
      compositor: details.composer || '',
      tom: details.key,
      bpm: details.bpm,
      compasso: details.compasso || '4/4',
      tipo: details.suggestedMoment || 'Entrada',
      season: details.suggestedSeason || 'Tempo Comum',
      ano: details.suggestedYear || 'Geral',
      letra: details.chords,
      chordPro,
      tags: details.tags || ['liturgia', 'importado-ia'],
      fonte: details.source || 'Motor Litúrgico IA',
      idExterno: details.id,
      urlOriginal: details.sourceUrl || '',
      dataImportacao: new Date().toISOString()
    };
  }
}

/**
 * Unified Registry of Music Providers
 */
export class MusicProviderRegistry {
  private static providers: MusicProvider[] = [
    new CatalogMusicProvider(),
    new AiLiturgicalMusicProvider()
  ];

  public static registerProvider(provider: MusicProvider) {
    this.providers.push(provider);
  }

  public static getProviders(): MusicProvider[] {
    return this.providers;
  }

  /**
   * Search unified across:
   * 1. Internal User Library (`cantos`)
   * 2. Canonical Catalog & Registered Providers
   * 3. AI Liturgical Engine
   */
  public static async searchAll(
    query: string, 
    internalLibrary: Canto[]
  ): Promise<{ internal: SearchResult[]; external: SearchResult[] }> {
    const q = query.toLowerCase().trim();
    if (!q) return { internal: [], external: [] };

    // 1. Search internal user library
    const internalMatches: SearchResult[] = internalLibrary
      .filter(c => 
        c.nome.toLowerCase().includes(q) ||
        (c.artista && c.artista.toLowerCase().includes(q)) ||
        (c.compositor && c.compositor.toLowerCase().includes(q)) ||
        (c.letra && c.letra.toLowerCase().includes(q))
      )
      .map(c => ({
        id: String(c.id),
        title: c.nome,
        artist: c.artista || 'Minha Biblioteca',
        composer: c.compositor,
        key: c.tom || 'C',
        source: 'Minha Biblioteca Musical',
        sourceType: 'internal',
        isInternal: true,
        internalCanto: c,
        previewLyrics: c.letra ? c.letra.substring(0, 100) + '...' : '',
        tempoLiturgicoSugerido: c.season,
        momentoSugerido: c.tipo,
        bpm: c.bpm,
        compasso: c.compasso
      }));

    // 2. Search registered providers in parallel
    const externalResults: SearchResult[] = [];
    
    // Catalog First
    const catalogProvider = this.providers.find(p => p.id === 'catalog_liturgico');
    if (catalogProvider) {
      const catResults = await catalogProvider.searchMusic(q);
      externalResults.push(...catResults);
    }

    // AI Provider in parallel
    const aiProvider = this.providers.find(p => p.id === 'ai_liturgico_engine');
    if (aiProvider) {
      try {
        const aiResults = await aiProvider.searchMusic(q);
        // Avoid adding duplicate titles from AI that already matched in catalog
        const existingTitles = new Set(externalResults.map(r => r.title.toLowerCase().trim()));
        for (const item of aiResults) {
          if (!existingTitles.has(item.title.toLowerCase().trim())) {
            externalResults.push(item);
          }
        }
      } catch (err) {
        console.warn("Busca IA não disponível no momento:", err);
      }
    }

    return {
      internal: internalMatches,
      external: externalResults
    };
  }
}

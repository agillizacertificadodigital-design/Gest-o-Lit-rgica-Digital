/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  ExternalLink, 
  Download, 
  Copy, 
  Link as LinkIcon, 
  Check, 
  AlertTriangle, 
  X, 
  Music, 
  Eye, 
  Loader2, 
  Layers, 
  Edit3, 
  FileText, 
  ShieldCheck, 
  CornerDownRight, 
  PlusCircle, 
  RefreshCw,
  Info,
  Calendar,
  CheckCircle2,
  UploadCloud,
  FileType,
  Globe,
  Radio,
  Play,
  Pause,
  Filter,
  Plus,
  Sliders,
  FileCode,
  Lock,
  Headphones,
  CheckSquare
} from 'lucide-react';
import { Canto, SeasonInfo, SearchResult, MusicDetails, CantoVersao, LinkAnalysisResult } from '../types';
import { musicProviderRegistry } from '../lib/providers/providerRegistry';
import { UnifiedSearchResult, MusicProviderInfo } from '../types/providers';
import { normalizeSearchString } from '../lib/providers/baseProvider';
import { parseChordsFromText, textToChordPro, transposeChordPro } from '../lib/chordPro';
import { NOTES_SHARP, INITIAL_CATEGORIES } from '../constants';
import { MusicIntegrationsSettingsModal } from './MusicIntegrationsSettingsModal';

interface SearchAndImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCanto: (cantoData: Partial<Canto>) => void;
  onSelectExistingCanto?: (canto: Canto) => void;
  existingCantos: Canto[];
  temposLiturgicos: SeasonInfo[];
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialQuery?: string;
  initialTab?: 'search' | 'file' | 'paste' | 'link';
}

type SearchFilterType = 
  | 'all' 
  | 'letra_cifra' 
  | 'with_chords' 
  | 'with_lyrics' 
  | 'with_audio' 
  | 'library' 
  | 'opensong' 
  | 'planning_center';

export function SearchAndImportModal({
  isOpen,
  onClose,
  onSaveCanto,
  onSelectExistingCanto,
  existingCantos,
  temposLiturgicos,
  showNotification,
  initialQuery = '',
  initialTab = 'search'
}: SearchAndImportModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'file' | 'paste' | 'link'>(initialTab);

  // Document / File Upload State (PDF, Word DOCX/DOC, TXT, ChordPro)
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docFileBase64, setDocFileBase64] = useState<string | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [docStatusMsg, setDocStatusMsg] = useState('');

  // Search State & Filter
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchFilter, setSearchFilter] = useState<SearchFilterType>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [internalResults, setInternalResults] = useState<Canto[]>([]);
  const [externalResults, setExternalResults] = useState<UnifiedSearchResult[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<{ id: string; name: string; status: string; count: number }[]>([]);
  const [providersList, setProvidersList] = useState<MusicProviderInfo[]>(() => musicProviderRegistry.getProviders());
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Audio Preview State (for Apple iTunes preview clips)
  const [activeAudioPreview, setActiveAudioPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // View Chord / Preview State
  const [previewSong, setPreviewSong] = useState<{
    id: string;
    title: string;
    artist: string;
    composer?: string;
    album?: string;
    year?: string | number;
    key?: string;
    chords?: string;
    lyrics?: string;
    bpm?: number;
    compasso?: string;
    source: string;
    coverUrl?: string;
    audioPreviewUrl?: string;
    externalUrl?: string;
    suggestedMoment?: string;
    suggestedSeason?: string;
    hasChords: boolean;
    hasLyrics: boolean;
    hasAudioPreview: boolean;
    isExternalReference?: boolean;
    isImportable?: boolean;
    sources?: {
      metadata?: string;
      audio?: string;
      chords?: string;
      lyrics?: string;
    };
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState<string>('C');

  // Conference & Review Screen State before Saving
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [reviewData, setReviewData] = useState<{
    nome: string;
    artista: string;
    compositor: string;
    album?: string;
    tom: string;
    bpm: number | '';
    compasso: string;
    tipo: string;
    season: string;
    ano: 'A' | 'B' | 'C' | 'Geral';
    letra: string;
    tags: string;
    fonte: string;
    fonteLetra?: string;
    fonteCifra?: string;
    fonteAudio?: string;
    fonteMetadados?: string;
    idExterno?: string;
    urlOriginal?: string;
    nomeVersao?: string;
  }>({
    nome: '',
    artista: '',
    compositor: '',
    tom: 'C',
    bpm: 80,
    compasso: '4/4',
    tipo: 'Entrada',
    season: 'Tempo Comum',
    ano: 'Geral',
    letra: '',
    tags: '',
    fonte: ''
  });

  // Duplicate match modal state
  const [duplicateMatch, setDuplicateMatch] = useState<Canto | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Paste Chords State
  const [pastedText, setPastedText] = useState('');
  const [isAnalyzingPaste, setIsAnalyzingPaste] = useState(false);

  // Link import state
  const [linkInput, setLinkInput] = useState('');
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);
  const [linkAnalysis, setLinkAnalysis] = useState<LinkAnalysisResult | null>(null);

  // Reset and load on open
  useEffect(() => {
    if (isOpen) {
      setProvidersList(musicProviderRegistry.getProviders());
      if (initialQuery) {
        setSearchQuery(initialQuery);
        handleExecuteSearch(initialQuery);
      } else {
        loadInitialCatalog();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setActiveAudioPreview(null);
    }
  }, [isOpen, initialQuery]);

  const loadInitialCatalog = async () => {
    // 1. Amostra de cantos da própria biblioteca
    setInternalResults(existingCantos.slice(0, 4));

    // 2. Amostra de cantos do acervo litúrgico comunitário
    try {
      const { results, providerStatus } = await musicProviderRegistry.searchAll({ query: '' });
      setExternalResults(results);
      setProviderStatuses(providerStatus);
    } catch {
      setExternalResults([]);
    }
    setHasSearched(false);
  };

  if (!isOpen) return null;

  // Search execution with Debounce & Priority Order
  const handleExecuteSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      loadInitialCatalog();
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    // 1. Pesquisa prioritária e instantânea na BIBLIOTECA INTERNA
    const normQ = normalizeSearchString(q);
    const matchedInternal = existingCantos.filter(c => {
      const nTitle = normalizeSearchString(c.nome);
      const nArtist = normalizeSearchString(c.artista || '');
      const nComposer = normalizeSearchString(c.compositor || '');
      const nLyrics = normalizeSearchString(c.letra || '');
      const nTags = (c.tags || []).map(t => normalizeSearchString(t)).join(' ');
      return nTitle.includes(normQ) || nArtist.includes(normQ) || nComposer.includes(normQ) || nLyrics.includes(normQ) || nTags.includes(normQ);
    });
    setInternalResults(matchedInternal);

    // 2. Consulta Provedores Externos Reais em paralelo
    try {
      const { results, providerStatus } = await musicProviderRegistry.searchAll({
        query: q,
        searchType: 'all'
      });
      setExternalResults(results);
      setProviderStatuses(providerStatus);
    } catch (err) {
      console.warn("Aviso na busca externa:", err);
      showNotification('Não foi possível consultar alguns provedores externos agora.', 'info');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle audio preview (Apple iTunes 30s official sample)
  const handleToggleAudioPreview = (audioUrl: string) => {
    if (activeAudioPreview === audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setActiveAudioPreview(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.warn('Erro ao tocar áudio:', e));
      audio.onended = () => setActiveAudioPreview(null);
      audioRef.current = audio;
      setActiveAudioPreview(audioUrl);
    }
  };

  // Preview Chord details
  const handleOpenPreview = async (item: UnifiedSearchResult | Canto) => {
    if ('letra' in item && !('providerId' in item)) {
      // Canto da biblioteca interna
      const canto = item as Canto;
      const hasRealChords = Boolean(canto.letra && canto.letra.trim().length > 0);
      setPreviewSong({
        id: String(canto.id),
        title: canto.nome,
        artist: canto.artista || 'Minha Biblioteca',
        composer: canto.compositor,
        key: canto.tom || 'C',
        chords: canto.letra || '',
        lyrics: canto.letra || '',
        bpm: canto.bpm,
        compasso: canto.compasso,
        source: 'Minha Biblioteca Musical',
        suggestedMoment: canto.tipo,
        suggestedSeason: canto.season,
        hasChords: hasRealChords,
        hasLyrics: Boolean(canto.letra),
        hasAudioPreview: false,
        isExternalReference: false,
        isImportable: false
      });
      setPreviewKey(canto.tom || 'C');
      setIsPreviewOpen(true);
      return;
    }

    const unified = item as UnifiedSearchResult;
    const hasRealChords = Boolean(unified.hasChords && unified.chords && unified.chords.trim().length > 0);
    const hasRealLyrics = Boolean(unified.hasLyrics || hasRealChords || (unified.lyrics && unified.lyrics.trim().length > 0));
    const hasAudio = Boolean(unified.hasAudioPreview && unified.audioPreviewUrl);

    setPreviewSong({
      id: unified.id,
      title: unified.title,
      artist: unified.artist,
      composer: unified.composer,
      album: unified.album,
      year: unified.year,
      key: unified.key || 'C',
      chords: hasRealChords ? unified.chords : undefined,
      lyrics: unified.lyrics,
      bpm: unified.bpm,
      compasso: unified.compasso,
      source: unified.providerName,
      coverUrl: unified.coverUrl || (unified as any).albumCoverUrl,
      audioPreviewUrl: unified.audioPreviewUrl,
      externalUrl: unified.externalUrl,
      suggestedMoment: unified.suggestedMoment || 'Entrada',
      suggestedSeason: unified.suggestedSeason || 'Tempo Comum',
      hasChords: hasRealChords,
      hasLyrics: hasRealLyrics,
      hasAudioPreview: hasAudio,
      isExternalReference: unified.isExternalReference,
      isImportable: unified.isImportable,
      sources: unified.sources
    });
    setPreviewKey(unified.key || 'C');
    setIsPreviewOpen(true);
  };

  // Import to Library button clicked
  const handleInitiateImport = (item: any) => {
    if (!item) return;
    const title = item.title || item.nome || '';
    const artist = item.artist || item.artista || '';
    const composer = item.composer || item.compositor || '';
    const album = item.album || '';
    const key = item.key || item.tom || 'C';
    const bpm = item.bpm || 80;
    const compasso = item.compasso || '4/4';
    const source = item.providerName || item.source || item.fonte || 'Provedor Externo';
    const moment = item.suggestedMoment || item.tipo || 'Entrada';
    const season = item.suggestedSeason || item.season || 'Tempo Comum';
    const chordsOrLyrics = item.chords || item.chordPro || item.lyrics || item.letra || '';

    // Verifica duplicidade exata ou muito próxima
    const normTitle = normalizeSearchString(title);
    const normArtist = normalizeSearchString(artist);
    const existing = existingCantos.find(c => {
      const eTitle = normalizeSearchString(c.nome);
      const eArtist = normalizeSearchString(c.artista || '');
      return eTitle === normTitle && (normArtist ? eArtist.includes(normArtist) || normArtist.includes(eArtist) : true);
    });

    // Fontes separadas
    const sources = item.sources || {};

    const dataToReview = {
      nome: title,
      artista: artist,
      compositor: composer,
      album: album,
      tom: key,
      bpm: bpm,
      compasso: compasso,
      tipo: moment,
      season: season,
      ano: 'Geral' as const,
      letra: chordsOrLyrics,
      tags: `importado, ${source.toLowerCase().replace(/\s+/g, '-')}`,
      fonte: source,
      fonteLetra: sources.lyrics || (item.hasLyrics ? source : undefined),
      fonteCifra: sources.chords || (item.hasChords ? source : undefined),
      fonteAudio: sources.audio || (item.hasAudioPreview ? source : undefined),
      fonteMetadados: sources.metadata || source,
      idExterno: item.id ? String(item.id) : undefined,
      urlOriginal: item.externalUrl || undefined,
      nomeVersao: `Versão ${source}`
    };

    setReviewData(dataToReview);

    if (existing) {
      setDuplicateMatch(existing);
      setIsDuplicateModalOpen(true);
    } else {
      setIsReviewOpen(true);
    }
  };

  // Salvar definitivo na Biblioteca
  const handleFinalSaveToLibrary = () => {
    if (!reviewData.nome.trim()) {
      showNotification('O título da música é obrigatório.', 'error');
      return;
    }

    const newCanto: Partial<Canto> = {
      nome: reviewData.nome.trim(),
      artista: reviewData.artista.trim() || undefined,
      compositor: reviewData.compositor.trim() || undefined,
      tom: reviewData.tom || 'C',
      bpm: typeof reviewData.bpm === 'number' ? reviewData.bpm : undefined,
      compasso: reviewData.compasso || '4/4',
      tipo: reviewData.tipo || 'Entrada',
      season: reviewData.season || 'Tempo Comum',
      ano: reviewData.ano || 'Geral',
      letra: reviewData.letra || '',
      tags: reviewData.tags ? reviewData.tags.split(',').map(t => t.trim()).filter(Boolean) : ['importado'],
      fonte: reviewData.fonte || 'Importação Multiprovedor',
      urlOriginal: reviewData.urlOriginal || undefined,
      versoes: [
        {
          id: `v_${Date.now()}`,
          nomeVersao: reviewData.nomeVersao || 'Versão Principal',
          tom: reviewData.tom || 'C',
          letra: reviewData.letra || '',
          bpm: typeof reviewData.bpm === 'number' ? reviewData.bpm : undefined,
          compasso: reviewData.compasso || '4/4',
          fonte: reviewData.fonte,
          dataCriacao: new Date().toISOString()
        }
      ]
    };

    onSaveCanto(newCanto);
    setIsReviewOpen(false);
    showNotification(`"${reviewData.nome}" salva com sucesso na sua Biblioteca Musical!`, 'success');
    onClose();
  };

  // Salvar como nova versão em música já existente
  const handleSaveAsNewVersion = (targetCanto: Canto) => {
    const updatedVersions: CantoVersao[] = [
      ...(targetCanto.versoes || []),
      {
        id: `v_${Date.now()}`,
        nomeVersao: reviewData.nomeVersao || `Versão ${reviewData.fonte || 'Importada'}`,
        tom: reviewData.tom || targetCanto.tom || 'C',
        letra: reviewData.letra || targetCanto.letra || '',
        bpm: typeof reviewData.bpm === 'number' ? reviewData.bpm : targetCanto.bpm,
        compasso: reviewData.compasso || targetCanto.compasso,
        fonte: reviewData.fonte,
        dataCriacao: new Date().toISOString()
      }
    ];

    onSaveCanto({
      ...targetCanto,
      versoes: updatedVersions
    });

    setIsDuplicateModalOpen(false);
    showNotification(`Nova versão adicionada a "${targetCanto.nome}" com sucesso!`, 'success');
    onClose();
  };

  // Analyze document (PDF, Word DOCX/DOC, TXT)
  const handleAnalyzeDocument = async () => {
    if (!selectedDocFile) {
      showNotification('Selecione um arquivo PDF ou Word.', 'info');
      return;
    }

    setIsAnalyzingDoc(true);
    setDocStatusMsg('Lendo e extraindo conteúdo do documento...');

    try {
      let fileContent = '';
      if (selectedDocFile.name.endsWith('.txt') || selectedDocFile.name.endsWith('.pro') || selectedDocFile.name.endsWith('.chopro') || selectedDocFile.name.endsWith('.xml')) {
        fileContent = await selectedDocFile.text();
      } else {
        fileContent = docFileBase64 || '';
      }

      setDocStatusMsg('Analisando acordes, seções e harmonia funcional...');

      const res = await fetch('/api/ai/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedDocFile.name,
          fileData: fileContent,
          fileType: selectedDocFile.type || 'application/pdf'
        })
      });

      if (!res.ok) throw new Error('Falha ao processar documento.');
      const data = await res.json();

      setReviewData({
        nome: data.nome || selectedDocFile.name.replace(/\.[^/.]+$/, ''),
        artista: data.artista || '',
        compositor: data.compositor || '',
        tom: data.tom || 'C',
        bpm: data.bpm || 80,
        compasso: data.compasso || '4/4',
        tipo: data.tipo || 'Entrada',
        season: data.season || 'Tempo Comum',
        ano: 'Geral',
        letra: data.letraFormatada || data.letra || '',
        tags: 'importado, documento, pdf-word',
        fonte: `Arquivo (${selectedDocFile.name})`,
        nomeVersao: 'Versão do Documento'
      });

      setIsReviewOpen(true);
    } catch (err) {
      console.warn("Fallback de parser local de documento:", err);
      setReviewData({
        nome: selectedDocFile.name.replace(/\.[^/.]+$/, ''),
        artista: '',
        compositor: '',
        tom: 'C',
        bpm: 80,
        compasso: '4/4',
        tipo: 'Entrada',
        season: 'Tempo Comum',
        ano: 'Geral',
        letra: '',
        tags: 'importado, documento',
        fonte: `Arquivo (${selectedDocFile.name})`,
        nomeVersao: 'Versão do Arquivo'
      });
      setIsReviewOpen(true);
    } finally {
      setIsAnalyzingDoc(false);
      setDocStatusMsg('');
    }
  };

  // Analyze pasted chord with AI
  const handleAnalyzePastedChords = async () => {
    if (!pastedText.trim()) {
      showNotification('Cole a cifra no campo de texto.', 'info');
      return;
    }

    setIsAnalyzingPaste(true);
    try {
      const res = await fetch('/api/ai/parse-chord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText })
      });

      if (!res.ok) throw new Error('Falha ao processar texto.');
      const data = await res.json();

      setReviewData({
        nome: data.nome || 'Novo Canto Litúrgico',
        artista: data.artista || '',
        compositor: data.compositor || '',
        tom: data.tom || 'C',
        bpm: data.bpm || 80,
        compasso: data.compasso || '4/4',
        tipo: data.tipo || 'Entrada',
        season: data.season || 'Tempo Comum',
        ano: 'Geral',
        letra: data.letraFormatada || data.letra || pastedText,
        tags: 'importado, colar-cifra',
        fonte: 'Colar Cifra',
        nomeVersao: 'Versão Importada'
      });

      setIsReviewOpen(true);
    } catch (err) {
      console.warn("Fallback de parser local:", err);
      const lines = pastedText.split('\n');
      const firstLine = lines[0]?.replace(/[#\[\]]/g, '').trim() || 'Novo Canto';
      const parsed = parseChordsFromText(pastedText);

      setReviewData({
        nome: firstLine,
        artista: '',
        compositor: '',
        tom: parsed.chords[0] || 'C',
        bpm: 80,
        compasso: '4/4',
        tipo: 'Entrada',
        season: 'Tempo Comum',
        ano: 'Geral',
        letra: pastedText,
        tags: 'importado, manual',
        fonte: 'Colar Cifra',
        nomeVersao: 'Versão Manual'
      });
      setIsReviewOpen(true);
    } finally {
      setIsAnalyzingPaste(false);
    }
  };

  // Analyze Link
  const handleAnalyzeLink = async () => {
    if (!linkInput.trim()) return;
    setIsAnalyzingLink(true);
    try {
      const res = await fetch('/api/ai/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput })
      });
      if (!res.ok) throw new Error('Falha ao analisar link');
      const data: LinkAnalysisResult = await res.json();
      setLinkAnalysis(data);
    } catch (err) {
      setLinkAnalysis({
        url: linkInput,
        platformName: 'Link Externo',
        canDirectImport: false,
        requiresAuthorization: true,
        reason: 'O link externo foi analisado. Utilize a ferramenta "Colar Cifra" para estruturar a harmonia mantendo a fidelidade das seções.',
        suggestedAction: 'paste_chords'
      });
    } finally {
      setIsAnalyzingLink(false);
    }
  };

  const connectedCount = musicProviderRegistry.getConnectedProvidersCount();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100">
                  Buscar Músicas, Letras & Cifras
                </h2>
                
                {/* Dynamic Connected Providers Indicator */}
                <button
                  onClick={() => setIsIntegrationsModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
                  title="Clique para gerenciar provedores conectados"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{connectedCount} Provedores Conectados</span>
                  <Sliders className="w-3 h-3 ml-0.5 text-emerald-400/80" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pesquisa unificada em tempo real: Apple Music, MusicBrainz, LRCLIB, lyrics.ovh, OpenSong, Acervo Litúrgico e referências oficiais.
              </p>
            </div>
          </div>
          <button 
            id="btn-close-search-import-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 flex-wrap sm:flex-nowrap">
          <button
            id="tab-search-music"
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            Pesquisa Multiprovedor
          </button>
          <button
            id="tab-file-import"
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Arquivo (PDF / Word)
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              PDF/DOCX
            </span>
          </button>
          <button
            id="tab-paste-chords"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            Colar Cifra
          </button>
          <button
            id="tab-import-link"
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Importar por Link
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: BUSCAR MÚSICAS E CIFRAS MULTIPROVEDOR */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      id="input-external-music-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch(searchQuery)}
                      placeholder="Pesquise por título, artista, compositor ou trecho da letra..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm shadow-inner"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => { setSearchQuery(''); loadInitialCatalog(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    id="btn-trigger-external-search"
                    onClick={() => handleExecuteSearch(searchQuery)}
                    disabled={isSearching}
                    className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    <span>Pesquisar</span>
                  </button>
                </div>

                {/* Filter Pills - Atualizados conforme Requisito 14 */}
                <div className="flex items-center justify-between flex-wrap gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Filtrar:
                    </span>
                    <button
                      id="filter-all-sources"
                      onClick={() => setSearchFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Todas as Fontes ({internalResults.length + externalResults.length})
                    </button>
                    <button
                      id="filter-library"
                      onClick={() => setSearchFilter('library')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'library'
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Minha Biblioteca ({internalResults.length})
                    </button>
                    <button
                      id="filter-letra-cifra"
                      onClick={() => setSearchFilter('letra_cifra')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'letra_cifra'
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-800 text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      Letra + Cifra ({externalResults.filter(r => r.hasLyrics && r.hasChords).length})
                    </button>
                    <button
                      id="filter-with-chords"
                      onClick={() => setSearchFilter('with_chords')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'with_chords'
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Com Cifra ({internalResults.filter(c => Boolean(c.letra && c.letra.trim().length > 0)).length + externalResults.filter(r => r.hasChords).length})
                    </button>
                    <button
                      id="filter-with-lyrics"
                      onClick={() => setSearchFilter('with_lyrics')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'with_lyrics'
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Com Letra ({internalResults.filter(c => Boolean(c.letra)).length + externalResults.filter(r => r.hasLyrics || r.hasChords).length})
                    </button>
                    <button
                      id="filter-with-audio"
                      onClick={() => setSearchFilter('with_audio')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'with_audio'
                          ? 'bg-pink-600 text-white font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Com Áudio ({externalResults.filter(r => r.hasAudioPreview).length})
                    </button>
                    <button
                      id="filter-opensong"
                      onClick={() => setSearchFilter('opensong')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'opensong'
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      OpenSong ({externalResults.filter(r => r.providerId === 'opensong' || r.sources?.chords === 'OpenSong').length})
                    </button>
                    <button
                      id="filter-planning-center"
                      onClick={() => setSearchFilter('planning_center')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'planning_center'
                          ? 'bg-emerald-700 text-white font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Planning Center ({externalResults.filter(r => r.providerId === 'planning_center' || r.sources?.chords === 'Planning Center').length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500">
                    <span>Sugestões:</span>
                    {['O Céu Se Abre', 'Segura na Mão de Deus', 'Glória a Deus nas Alturas', 'Cordeiro de Deus'].map((sug) => (
                      <button
                        key={sug}
                        onClick={() => {
                          setSearchQuery(sug);
                          handleExecuteSearch(sug);
                        }}
                        className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 hover:text-amber-400 rounded text-[11px] transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loading Indicator */}
              {isSearching && (
                <div className="p-8 text-center bg-slate-800/20 rounded-2xl border border-slate-800 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    Consultando múltiplos provedores e acervos musicais em paralelo...
                  </p>
                  <p className="text-xs text-slate-500">
                    Buscando áudio, metadados, letras no LRCLIB/lyrics.ovh e cifras no OpenSong/Acervo Litúrgico.
                  </p>
                </div>
              )}

              {/* 1. Internal Library Results Section */}
              {!isSearching && (searchFilter === 'all' || searchFilter === 'library' || searchFilter === 'with_chords' || searchFilter === 'with_lyrics') && (
                (() => {
                  const filteredInternal = internalResults.filter(c => {
                    if (searchFilter === 'with_chords') return Boolean(c.letra && c.letra.trim().length > 0);
                    if (searchFilter === 'with_lyrics') return Boolean(c.letra);
                    return true;
                  });

                  if (filteredInternal.length === 0) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          1. Encontrado na Minha Biblioteca Musical ({filteredInternal.length})
                        </h3>
                        <span className="text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ✓ Já cadastrado no seu repertório
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredInternal.map(item => (
                          <div 
                            key={`int_${item.id}`}
                            className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-slate-100 text-base">{item.nome}</h4>
                                  <p className="text-xs text-slate-300 mt-0.5">
                                    <span className="text-slate-400">Artista:</span> {item.artista || 'Minha Biblioteca'}
                                    {item.compositor && ` • Comp: ${item.compositor}`}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded">
                                  Tom: {item.tom || 'C'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-2.5 text-xs">
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                                  {item.tipo || 'Liturgia'}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                                  {item.season || 'Tempo Comum'}
                                </span>
                                {item.bpm && (
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                                    {item.bpm} BPM
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-emerald-500/20">
                              <button
                                onClick={() => handleOpenPreview(item)}
                                className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                Visualizar Cifra
                              </button>
                              {onSelectExistingCanto && (
                                <button
                                  onClick={() => {
                                    onSelectExistingCanto(item);
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                                >
                                  Abrir na Biblioteca
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* 2. External & Multi-provider Results Section */}
              {!isSearching && searchFilter !== 'library' && (
                (() => {
                  const filteredExternal = externalResults.filter(r => {
                    if (searchFilter === 'letra_cifra') return r.hasLyrics && r.hasChords;
                    if (searchFilter === 'with_chords') return r.hasChords;
                    if (searchFilter === 'with_lyrics') return r.hasLyrics || r.hasChords;
                    if (searchFilter === 'with_audio') return r.hasAudioPreview;
                    if (searchFilter === 'opensong') return r.providerId === 'opensong' || r.sources?.chords === 'OpenSong';
                    if (searchFilter === 'planning_center') return r.providerId === 'planning_center' || r.sources?.chords === 'Planning Center';
                    return true;
                  });

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          2. Provedores Externos & Acervos ({filteredExternal.length})
                        </h3>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Fontes verificadas e transparentes
                        </span>
                      </div>

                      {filteredExternal.length === 0 ? (
                        <div className="p-8 text-center bg-slate-800/20 rounded-xl border border-slate-800 text-slate-400 text-sm space-y-3">
                          {searchFilter === 'with_chords' || searchFilter === 'letra_cifra' ? (
                            <>
                              <p className="font-semibold text-slate-300">
                                Nenhuma cifra pronta encontrada nos provedores conectados para "{searchQuery}".
                              </p>
                              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                                Provedores de áudio/catálogo (Apple Music) e letras (LRCLIB/lyrics.ovh) não disponibilizam cifras automáticas. Utilize o acervo OpenSong local ou as ferramentas abaixo:
                              </p>
                              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                                <button
                                  onClick={() => setActiveTab('paste')}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  <Copy className="w-4 h-4" />
                                  Colar Cifra com IA
                                </button>
                                <button
                                  onClick={() => setActiveTab('file')}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  <UploadCloud className="w-4 h-4" />
                                  Importar Arquivo (PDF/Word)
                                </button>
                                <button
                                  onClick={() => setIsIntegrationsModalOpen(true)}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
                                >
                                  <FileCode className="w-4 h-4 text-amber-400" />
                                  Configurar Acervo OpenSong
                                </button>
                              </div>
                            </>
                          ) : (
                            <p>
                              Nenhum resultado externo encontrado para "{searchQuery}". Tente usar as abas <strong>"Colar Cifra"</strong> ou <strong>"Arquivo (PDF/Word)"</strong> para estruturar e importar seu canto.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {filteredExternal.map((item) => {
                            const isFullResult = item.hasLyrics && item.hasChords;
                            const isLyricsOnly = item.hasLyrics && !item.hasChords;
                            const isChordsOnly = item.hasChords && !item.hasLyrics;
                            const isAudioOnly = item.hasAudioPreview && !item.hasLyrics && !item.hasChords;

                            return (
                              <div 
                                key={`ext_${item.providerId}_${item.id}`}
                                className={`p-4 rounded-xl transition-all flex flex-col justify-between group shadow-sm hover:shadow-md border ${
                                  isFullResult 
                                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/70' 
                                    : isLyricsOnly
                                    ? 'bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-500/70'
                                    : 'bg-slate-800/50 border-slate-700/70 hover:border-amber-500/40'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-3">
                                    {item.coverUrl && (
                                      <img 
                                        src={item.coverUrl} 
                                        alt={item.title} 
                                        className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-slate-100 text-base group-hover:text-amber-300 transition-colors truncate">
                                        {item.title}
                                      </h4>
                                      <p className="text-xs text-slate-300 truncate">
                                        <strong className="text-slate-400">Artista:</strong> {item.artist}
                                      </p>
                                    </div>
                                    
                                    {/* Top Right Capability Badge */}
                                    {isFullResult ? (
                                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black rounded shrink-0 flex items-center gap-1 shadow-xs">
                                        <span>✅ LETRA + CIFRA</span>
                                      </span>
                                    ) : isLyricsOnly ? (
                                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded shrink-0 flex items-center gap-1">
                                        <span>📝 Letra disponível</span>
                                      </span>
                                    ) : isChordsOnly ? (
                                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded shrink-0 flex items-center gap-1">
                                        <span>🎸 Cifra: {item.key || 'C'}</span>
                                      </span>
                                    ) : isAudioOnly ? (
                                      <span className="px-2 py-0.5 bg-pink-500/10 text-pink-300 border border-pink-500/30 text-xs font-bold rounded shrink-0 flex items-center gap-1">
                                        <span>🎧 Áudio & Catálogo</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-bold rounded shrink-0 flex items-center gap-1">
                                        <span>📄 Metadados</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Sources Breakdown Transparent Matrix */}
                                  <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                                    {item.composer && (
                                      <p><strong className="text-slate-400">Compositor:</strong> {item.composer}</p>
                                    )}
                                    {item.album && (
                                      <p><strong className="text-slate-400">Álbum:</strong> {item.album}</p>
                                    )}

                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                      <strong className="text-slate-400 text-[11px]">Fontes:</strong>
                                      {item.sources?.lyrics && (
                                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                          Letra: {item.sources.lyrics}
                                        </span>
                                      )}
                                      {item.sources?.chords && (
                                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                          Cifra: {item.sources.chords}
                                        </span>
                                      )}
                                      {item.sources?.audio && (
                                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-pink-500/10 text-pink-300 border border-pink-500/20">
                                          Áudio: {item.sources.audio}
                                        </span>
                                      )}
                                      {item.sources?.metadata && !item.sources.audio && (
                                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                          Metadados: {item.sources.metadata}
                                        </span>
                                      )}
                                      {!item.sources && (
                                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-700 text-slate-300">
                                          {item.providerName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {item.previewLyrics && (
                                    <p className="mt-2 text-xs text-slate-400 italic line-clamp-2 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                                      "{item.previewLyrics}"
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 mt-2.5 text-xs flex-wrap">
                                    {item.key && (
                                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded font-bold">
                                        Tom: {item.key}
                                      </span>
                                    )}
                                    {item.suggestedMoment && (
                                      <span className="px-2 py-0.5 bg-slate-700/50 text-slate-200 rounded">
                                        {item.suggestedMoment}
                                      </span>
                                    )}
                                    {item.bpm && (
                                      <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                                        {item.bpm} BPM
                                      </span>
                                    )}
                                    {item.audioPreviewUrl && (
                                      <button
                                        onClick={() => handleToggleAudioPreview(item.audioPreviewUrl!)}
                                        className="px-2.5 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded flex items-center gap-1.5 hover:bg-pink-500/30 transition-colors font-medium"
                                      >
                                        {activeAudioPreview === item.audioPreviewUrl ? (
                                          <>
                                            <Pause className="w-3.5 h-3.5" />
                                            <span>Pausar</span>
                                          </>
                                        ) : (
                                          <>
                                            <Play className="w-3.5 h-3.5" />
                                            <span>Prévia Áudio (30s)</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons - Rigorosamente adaptados ao Requisito 10, 11, 12, 13 */}
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/60">
                                  {isFullResult ? (
                                    /* REQUISITO 10: RESULTADO COMPLETO (LETRA + CIFRA) */
                                    <>
                                      <button
                                        id={`btn-view-chord-${item.id}`}
                                        onClick={() => handleOpenPreview(item)}
                                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                        Visualizar Letra + Cifra
                                      </button>
                                      <button
                                        id={`btn-import-library-${item.id}`}
                                        onClick={() => handleInitiateImport(item)}
                                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Importar para Biblioteca
                                      </button>
                                    </>
                                  ) : isLyricsOnly ? (
                                    /* REQUISITO 11: RESULTADO SOMENTE COM LETRA */
                                    <>
                                      <button
                                        id={`btn-view-lyrics-${item.id}`}
                                        onClick={() => handleOpenPreview(item)}
                                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                        Visualizar Letra
                                      </button>
                                      <button
                                        onClick={() => handleInitiateImport(item)}
                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Salvar Música
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveTab('paste');
                                          setPastedText(`${item.title}\n${item.artist}\n\n${item.lyrics || ''}`);
                                        }}
                                        className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                                        title="Adicionar acordes sobre esta letra"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                        Adicionar Cifra
                                      </button>
                                    </>
                                  ) : isChordsOnly ? (
                                    /* REQUISITO 13: RESULTADO COM CIFRA */
                                    <>
                                      <button
                                        onClick={() => handleOpenPreview(item)}
                                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                                        Visualizar Cifra
                                      </button>
                                      <button
                                        onClick={() => handleInitiateImport(item)}
                                        className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Importar
                                      </button>
                                    </>
                                  ) : isAudioOnly ? (
                                    /* REQUISITO 12: RESULTADO SOMENTE COM ÁUDIO & CATÁLOGO */
                                    <>
                                      <button
                                        id={`btn-details-${item.id}`}
                                        onClick={() => handleOpenPreview(item)}
                                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-pink-400" />
                                        Detalhes da Faixa
                                      </button>
                                      {item.externalUrl && (
                                        <a
                                          href={item.externalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors shrink-0"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                          Apple Music
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleInitiateImport(item)}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors shrink-0"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-slate-300" />
                                        Salvar Referência
                                      </button>
                                    </>
                                  ) : item.isExternalReference ? (
                                    /* Referência Externa Licenciada (Cifra Club) */
                                    <>
                                      {item.externalUrl && (
                                        <a
                                          href={item.externalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex-1 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                          Abrir no Cifra Club
                                        </a>
                                      )}
                                      <button
                                        onClick={() => {
                                          setActiveTab('paste');
                                          setPastedText(`${item.title}\n${item.artist}\n`);
                                        }}
                                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                                        Colar Cifra com IA
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleOpenPreview(item)}
                                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                                        Detalhes
                                      </button>
                                      <button
                                        onClick={() => handleInitiateImport(item)}
                                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Salvar Metadados
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* TAB 2: ARQUIVOS PDF & WORD (DOCX/DOC/TXT/CHORDPRO) */}
          {activeTab === 'file' && (
            <div className="space-y-5">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  Importação de Partituras, Folhetos e Cifras (PDF, DOCX, TXT)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Carregue um arquivo com cifras de missa ou hinário. O motor harmônico do Gestão Litúrgica processará o texto, identificará seções, acordes e tom original para conversão automática em ChordPro.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div className="p-8 border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl bg-slate-950/60 text-center space-y-4 transition-all">
                <FileType className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-slate-200">
                    Arraste seu arquivo PDF, Word (.docx) ou Texto aqui
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos aceitos: PDF, DOCX, DOC, TXT, ChordPro (.pro), XML OpenSong
                  </p>
                </div>

                <input
                  id="input-file-doc-import"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.pro,.chopro,.xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedDocFile(file);
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        setDocFileBase64(base64);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />

                <div className="pt-2">
                  <label
                    htmlFor="input-file-doc-import"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    <FileType className="w-4 h-4" />
                    {selectedDocFile ? 'Trocar Arquivo Selecionado' : 'Selecionar Arquivo PDF / Word'}
                  </label>
                </div>
              </div>

              {/* Selected File Details */}
              {selectedDocFile && (
                <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200 truncate max-w-sm">
                        {selectedDocFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Tamanho: {(selectedDocFile.size / 1024).toFixed(1)} KB • Extensão: {selectedDocFile.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-black uppercase">
                    Pronto para Análise
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                {selectedDocFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocFile(null);
                      setDocFileBase64(null);
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Remover
                  </button>
                )}
                <button
                  id="btn-process-doc-file"
                  type="button"
                  onClick={handleAnalyzeDocument}
                  disabled={isAnalyzingDoc || !selectedDocFile}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isAnalyzingDoc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{docStatusMsg || 'Analisando documento...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extrair e Estruturar Cifra com IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: COLAR CIFRA */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-100">
                    Importação Manual Rápida com Identificação Automática
                  </p>
                  <p>
                    Copie a cifra de qualquer portal ou arquivo e cole abaixo. O sistema identificará automaticamente <strong>título</strong>, <strong>tom</strong>, <strong>letra</strong>, <strong>acordes</strong> e seções litúrgicas.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Cole o texto completo da cifra:
                </label>
                <textarea
                  id="textarea-paste-chords"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`[Intro] G  D/F#  Em  C\n\nG             D/F#\nSegura na mão de Deus e vai...\n\n[Refrão]\nG             D/F#\nSegura na mão de Deus...`}
                  rows={12}
                  className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPastedText('')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Limpar
                </button>
                <button
                  id="btn-process-pasted-chords"
                  type="button"
                  onClick={handleAnalyzePastedChords}
                  disabled={isAnalyzingPaste || !pastedText.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
                >
                  {isAnalyzingPaste ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Analisar e Estruturar com IA</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: IMPORTAR POR LINK */}
          {activeTab === 'link' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-amber-400" />
                  Importar ou Analisar Link de Música
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Insira o link de uma cifra ou música. O sistema verificará se a fonte disponibiliza API autorizada de importação direta, mantendo a conformidade com as diretrizes do portal.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cole o link da música ou cifra:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      id="input-import-link-url"
                      type="url"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="https://www.cifraclub.com.br/artistas/nome-da-musica/ ou link do YouTube..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    id="btn-analyze-link"
                    onClick={handleAnalyzeLink}
                    disabled={isAnalyzingLink || !linkInput.trim()}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isAnalyzingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Analisar</span>
                  </button>
                </div>
              </div>

              {/* Link Analysis Report */}
              {linkAnalysis && (
                <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-4 animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {linkAnalysis.platformName}
                      </span>
                      {linkAnalysis.detectedTitle && (
                        <h4 className="text-base font-bold text-slate-100 mt-2">
                          {linkAnalysis.detectedTitle} {linkAnalysis.detectedArtist ? `— ${linkAnalysis.detectedArtist}` : ''}
                        </h4>
                      )}
                    </div>
                    {linkAnalysis.canDirectImport ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" /> Importação Direta Permitida
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" /> Proteção de Direitos & Diretrizes
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    {linkAnalysis.reason}
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setActiveTab('paste');
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Usar "Colar Cifra" Agora
                    </button>
                    {linkAnalysis.detectedTitle && (
                      <button
                        onClick={() => {
                          setSearchQuery(linkAnalysis.detectedTitle || '');
                          setActiveTab('search');
                          handleExecuteSearch(linkAnalysis.detectedTitle || '');
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Buscar no Acervo Litúrgico
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Bancos ativos: Apple Music, MusicBrainz, LRCLIB, lyrics.ovh, OpenSong, Planning Center.</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL: VISUALIZAR CIFRA / LETRA / DETALHES (Pré-visualização Transparente)
          ========================================================================= */}
      {isPreviewOpen && previewSong && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Preview Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0">
              <div className="flex items-center gap-3">
                {previewSong.coverUrl && (
                  <img 
                    src={previewSong.coverUrl} 
                    alt={previewSong.title} 
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Music className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="truncate">{previewSong.title}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Artista: <strong className="text-slate-300">{previewSong.artist}</strong> 
                    {previewSong.composer ? ` • Comp: ${previewSong.composer}` : ''} 
                    {previewSong.album ? ` • Álbum: ${previewSong.album}` : ''}
                  </p>
                </div>
              </div>

              {/* Transpose Tool on Preview (Only if real chords exist) */}
              <div className="flex items-center gap-3">
                {previewSong.hasChords && previewSong.chords && (
                  <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-400 px-1 font-semibold">Tom:</span>
                    <select
                      value={previewKey}
                      onChange={(e) => setPreviewKey(e.target.value)}
                      className="bg-slate-900 text-amber-400 text-xs font-bold rounded px-2 py-1 border border-slate-700 focus:outline-none"
                    >
                      {NOTES_SHARP.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Audio Strip (if song has Apple Music preview clip) */}
            {previewSong.audioPreviewUrl && (
              <div className="px-5 py-2.5 bg-pink-950/30 border-b border-pink-500/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-pink-300">
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                  <span className="font-semibold">Prévia de Áudio Oficial (30s) — Apple Music</span>
                </div>
                <button
                  onClick={() => handleToggleAudioPreview(previewSong.audioPreviewUrl!)}
                  className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {activeAudioPreview === previewSong.audioPreviewUrl ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Reproduzir Prévia</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Preview Body */}
            {previewSong.hasChords && previewSong.chords ? (
              /* REAL CHORD VIEW */
              <div className="p-5 overflow-y-auto flex-1 bg-slate-950/80 font-mono text-sm leading-relaxed text-slate-200">
                <pre className="whitespace-pre-wrap font-mono">
                  {(() => {
                    const originalKey = previewSong.key || 'C';
                    const origIdx = NOTES_SHARP.indexOf(originalKey.replace('m', ''));
                    const newIdx = NOTES_SHARP.indexOf(previewKey.replace('m', ''));
                    const diff = origIdx !== -1 && newIdx !== -1 ? (newIdx - origIdx + 12) % 12 : 0;
                    return diff === 0 
                      ? previewSong.chords 
                      : transposeChordPro(previewSong.chords, diff, originalKey);
                  })()}
                </pre>
              </div>
            ) : previewSong.hasLyrics && previewSong.lyrics ? (
              /* REAL LYRICS-ONLY VIEW (LRCLIB, lyrics.ovh) */
              <div className="p-6 overflow-y-auto flex-1 bg-slate-950/90 space-y-4">
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-300">
                  <span className="font-semibold">
                    Letra Oficial Fornecida por: {previewSong.sources?.lyrics || previewSong.source}
                  </span>
                  <span className="text-[11px] bg-indigo-500/20 px-2 py-0.5 rounded font-bold">
                    Letra Sem Cifra
                  </span>
                </div>

                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {previewSong.lyrics}
                </div>
              </div>
            ) : (
              /* TRANSPARENT METADATA & AUDIO-ONLY VIEW */
              <div className="p-6 overflow-y-auto flex-1 bg-slate-950/90 space-y-6">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-amber-300">
                      Informações de Catálogo & Áudio Verificado
                    </p>
                    <p className="leading-relaxed">
                      Esta fonte fornece metadados e prévia de áudio oficial. A letra e a cifra não foram localizadas nesta consulta e não são inventadas.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Ficha Técnica Oficial da Faixa
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 font-medium">Título da Faixa:</span>
                      <p className="text-slate-100 font-bold text-sm mt-0.5">{previewSong.title}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Artista Principal:</span>
                      <p className="text-slate-100 font-bold text-sm mt-0.5">{previewSong.artist}</p>
                    </div>
                    {previewSong.album && (
                      <div>
                        <span className="text-slate-500 font-medium">Álbum / Obra:</span>
                        <p className="text-slate-200 font-semibold mt-0.5">{previewSong.album}</p>
                      </div>
                    )}
                    {previewSong.year && (
                      <div>
                        <span className="text-slate-500 font-medium">Ano de Lançamento:</span>
                        <p className="text-slate-200 font-semibold mt-0.5">{previewSong.year}</p>
                      </div>
                    )}
                    {previewSong.composer && (
                      <div>
                        <span className="text-slate-500 font-medium">Compositor:</span>
                        <p className="text-slate-200 font-semibold mt-0.5">{previewSong.composer}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 font-medium">Fonte de Dados:</span>
                      <p className="text-slate-200 font-semibold mt-0.5">{previewSong.source}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Voltar à Lista
              </button>

              <div className="flex items-center gap-2">
                {previewSong.hasLyrics && !previewSong.hasChords && (
                  <button
                    onClick={() => {
                      setIsPreviewOpen(false);
                      setActiveTab('paste');
                      setPastedText(`${previewSong.title}\n${previewSong.artist}\n\n${previewSong.lyrics || ''}`);
                    }}
                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    Adicionar Cifra
                  </button>
                )}

                <button
                  id="btn-import-from-preview"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    handleInitiateImport(previewSong);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  {previewSong.hasChords ? 'Importar Cifra para Biblioteca' : 'Salvar Música na Biblioteca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TELA DE CONFERÊNCIA ANTES DE SALVAR (Review Screen)
          ========================================================================= */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Revisar & Salvar na Biblioteca</h3>
                  <p className="text-xs text-slate-400">
                    Confira metadados, tonalidade e fontes antes de adicionar ao repertório permanente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Review Form Fields */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Título da Música *
                  </label>
                  <input
                    type="text"
                    value={reviewData.nome}
                    onChange={(e) => setReviewData({ ...reviewData, nome: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Artista / Ministério
                  </label>
                  <input
                    type="text"
                    value={reviewData.artista}
                    onChange={(e) => setReviewData({ ...reviewData, artista: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Compositor / Arranjador
                  </label>
                  <input
                    type="text"
                    value={reviewData.compositor}
                    onChange={(e) => setReviewData({ ...reviewData, compositor: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Álbum
                  </label>
                  <input
                    type="text"
                    value={reviewData.album || ''}
                    onChange={(e) => setReviewData({ ...reviewData, album: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tom
                  </label>
                  <select
                    value={reviewData.tom}
                    onChange={(e) => setReviewData({ ...reviewData, tom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-amber-400 font-bold text-sm"
                  >
                    {NOTES_SHARP.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Momento Litúrgico
                  </label>
                  <select
                    value={reviewData.tipo}
                    onChange={(e) => setReviewData({ ...reviewData, tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm"
                  >
                    {INITIAL_CATEGORIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tempo Litúrgico
                  </label>
                  <select
                    value={reviewData.season}
                    onChange={(e) => setReviewData({ ...reviewData, season: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm"
                  >
                    {temposLiturgicos.map(t => (
                      <option key={t.id} value={t.id}>{t.label || t.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    BPM / Andamento
                  </label>
                  <input
                    type="number"
                    value={reviewData.bpm}
                    onChange={(e) => setReviewData({ ...reviewData, bpm: Number(e.target.value) || '' })}
                    placeholder="80"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm"
                  />
                </div>
              </div>

              {/* Origem transparente dos dados */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px] block">
                  Origem dos Dados Detectados:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Fonte da Letra:</span>
                    <p className="font-semibold text-blue-400">{reviewData.fonteLetra || 'N/D'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Fonte da Cifra:</span>
                    <p className="font-semibold text-emerald-400">{reviewData.fonteCifra || 'N/D'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Fonte do Áudio:</span>
                    <p className="font-semibold text-pink-400">{reviewData.fonteAudio || 'N/D'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Metadados:</span>
                    <p className="font-semibold text-purple-400">{reviewData.fonteMetadados || reviewData.fonte || 'N/D'}</p>
                  </div>
                </div>
              </div>

              {/* Chords & Lyrics Preview / Edit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Letra & Cifra Estruturada (Padrão ChordPro)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditingReview(!isEditingReview)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditingReview ? 'Modo Visualização' : 'Editar Cifra / Letra'}
                  </button>
                </div>

                {isEditingReview ? (
                  <textarea
                    value={reviewData.letra}
                    onChange={(e) => setReviewData({ ...reviewData, letra: e.target.value })}
                    rows={10}
                    className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl max-h-64 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {reviewData.letra || <span className="text-slate-500 italic">Sem letra/cifra cadastrada.</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
              <button
                id="btn-review-cancel"
                onClick={() => setIsReviewOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-review-edit"
                  onClick={() => setIsEditingReview(!isEditingReview)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingReview ? 'Concluir Edição' : 'Editar'}
                </button>

                <button
                  id="btn-review-save-library"
                  onClick={handleFinalSaveToLibrary}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  Salvar na Minha Biblioteca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETECÇÃO DE DUPLICIDADE (Anti-Duplicate Resolution)
          ========================================================================= */}
      {isDuplicateModalOpen && duplicateMatch && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-100">
                Esta música já pode estar cadastrada.
              </h3>
            </div>

            <p className="text-sm text-slate-300">
              Já existe uma música chamada <strong className="text-amber-400">"{duplicateMatch.nome}"</strong> na sua Biblioteca Musical.
            </p>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs text-slate-400">
              <p><strong className="text-slate-300">Existente:</strong> {duplicateMatch.nome} ({duplicateMatch.artista || 'Artista não especificado'})</p>
              <p><strong className="text-slate-300">Tom Atual:</strong> {duplicateMatch.tom} • <strong className="text-slate-300">Momento:</strong> {duplicateMatch.tipo}</p>
              {duplicateMatch.versoes && duplicateMatch.versoes.length > 0 && (
                <p><strong className="text-slate-300">Versões existentes:</strong> {duplicateMatch.versoes.length} versão(ões)</p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                id="btn-duplicate-open-existing"
                onClick={() => {
                  setIsDuplicateModalOpen(false);
                  onClose();
                  if (onSelectExistingCanto) {
                    onSelectExistingCanto(duplicateMatch);
                  }
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Abrir Existente
              </button>

              <button
                id="btn-duplicate-import-version"
                onClick={() => handleSaveAsNewVersion(duplicateMatch)}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Layers className="w-4 h-4" />
                Importar Nova Versão (Vincular a esta Música)
              </button>

              <button
                id="btn-duplicate-cancel"
                onClick={() => setIsDuplicateModalOpen(false)}
                className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE INTEGRAÇÕES & ACERVOS */}
      <MusicIntegrationsSettingsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => {
          setIsIntegrationsModalOpen(false);
          setProvidersList(musicProviderRegistry.getProviders());
        }}
        onProvidersChanged={() => {
          setProvidersList(musicProviderRegistry.getProviders());
        }}
      />

    </div>
  );
}

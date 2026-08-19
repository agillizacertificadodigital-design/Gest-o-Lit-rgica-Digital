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
  Filter
} from 'lucide-react';
import { Canto, SeasonInfo, SearchResult, MusicDetails, CantoVersao, LinkAnalysisResult } from '../types';
import { musicProviderRegistry } from '../lib/providers/providerRegistry';
import { UnifiedSearchResult, MusicProviderInfo } from '../types/providers';
import { normalizeSearchString } from '../lib/providers/baseProvider';
import { parseChordsFromText, textToChordPro, transposeChordPro } from '../lib/chordPro';
import { NOTES_SHARP, INITIAL_CATEGORIES } from '../constants';

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
  const [searchFilter, setSearchFilter] = useState<'all' | 'library' | 'liturgical' | 'external'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [internalResults, setInternalResults] = useState<Canto[]>([]);
  const [externalResults, setExternalResults] = useState<UnifiedSearchResult[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<{ id: string; name: string; status: string; count: number }[]>([]);
  const [providersList, setProvidersList] = useState<MusicProviderInfo[]>(() => musicProviderRegistry.getProviders());
  const [showProvidersPopover, setShowProvidersPopover] = useState(false);
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
    key: string;
    chords: string;
    bpm?: number;
    compasso?: string;
    source: string;
    externalUrl?: string;
    suggestedMoment?: string;
    suggestedSeason?: string;
    isExternalReference?: boolean;
    isImportable?: boolean;
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
    tom: string;
    bpm: number | '';
    compasso: string;
    tipo: string;
    season: string;
    ano: 'A' | 'B' | 'C' | 'Geral';
    letra: string;
    tags: string;
    fonte: string;
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
    tags: 'importado, liturgia',
    fonte: 'Acervo Litúrgico Comunitário',
    nomeVersao: 'Versão Original'
  });

  // Duplicate resolution modal state
  const [duplicateMatch, setDuplicateMatch] = useState<Canto | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Paste Tab State
  const [pastedText, setPastedText] = useState('');
  const [isAnalyzingPaste, setIsAnalyzingPaste] = useState(false);

  // Link Import Tab State
  const [linkInput, setLinkInput] = useState('');
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);
  const [linkAnalysis, setLinkAnalysis] = useState<LinkAnalysisResult | null>(null);

  // Debounce ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProvidersList(musicProviderRegistry.getProviders());
      if (initialQuery) {
        setSearchQuery(initialQuery);
        handleExecuteSearch(initialQuery);
      } else {
        loadInitialCatalog();
      }
    }
  }, [isOpen, initialQuery]);

  // Clean audio on unmount or close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

    // 1. Pesquisa prioritária e instantânea na BIBLIOTECA INTERNA (Regra 6 e 25)
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

    // 2. Consulta Provedores Externos Reais em paralelo (Regra 3, 6 e 13)
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
      setPreviewSong({
        id: String(canto.id),
        title: canto.nome,
        artist: canto.artista || 'Minha Biblioteca',
        composer: canto.compositor,
        key: canto.tom || 'C',
        chords: canto.letra || '',
        bpm: canto.bpm,
        compasso: canto.compasso,
        source: 'Minha Biblioteca Musical',
        suggestedMoment: canto.tipo,
        suggestedSeason: canto.season,
        isExternalReference: false,
        isImportable: false
      });
      setPreviewKey(canto.tom || 'C');
      setIsPreviewOpen(true);
      return;
    }

    const unified = item as UnifiedSearchResult;
    setPreviewSong({
      id: unified.id,
      title: unified.title,
      artist: unified.artist,
      composer: unified.composer,
      key: unified.key || 'C',
      chords: unified.chords || `${unified.key || 'C'}   G   Am   F\n\n[Verso]\n${unified.title}\nLetra fornecida pela fonte oficial.`,
      bpm: unified.bpm || 80,
      compasso: unified.compasso || '4/4',
      source: unified.providerName,
      externalUrl: unified.externalUrl,
      suggestedMoment: unified.suggestedMoment || 'Entrada',
      suggestedSeason: unified.suggestedSeason || 'Tempo Comum',
      isExternalReference: unified.isExternalReference,
      isImportable: unified.isImportable
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
    const key = item.key || item.tom || 'C';
    const bpm = item.bpm || 80;
    const compasso = item.compasso || '4/4';
    const source = item.providerName || item.source || item.fonte || 'Provedor Externo';
    const moment = item.suggestedMoment || item.tipo || 'Entrada';
    const season = item.suggestedSeason || item.season || 'Tempo Comum';
    const chords = item.chords || item.letra || `${key}   G   Am   F\n${title}\n`;

    // Check duplicate in user's library
    const existing = existingCantos.find(c => 
      c.nome.trim().toLowerCase() === title.trim().toLowerCase() ||
      (artist && c.artista?.trim().toLowerCase() === artist.trim().toLowerCase() && c.nome.trim().toLowerCase() === title.trim().toLowerCase())
    );

    const prepData = {
      nome: title,
      artista: artist,
      compositor: composer,
      tom: key,
      bpm: bpm,
      compasso: compasso,
      tipo: moment,
      season: season,
      ano: 'Geral' as const,
      letra: chords,
      tags: `importado, ${moment.toLowerCase()}`,
      fonte: source,
      idExterno: item.id,
      urlOriginal: item.externalUrl || '',
      nomeVersao: 'Versão Principal'
    };

    setReviewData(prepData);

    if (existing) {
      setDuplicateMatch(existing);
      setIsDuplicateModalOpen(true);
    } else {
      setIsReviewOpen(true);
    }
  };

  // Handle Save from Review screen
  const handleFinalSaveToLibrary = () => {
    if (!reviewData.nome.trim()) {
      showNotification('O nome do canto é obrigatório.', 'error');
      return;
    }

    const chordPro = textToChordPro(reviewData.letra);
    const tagsArray = reviewData.tags.split(',').map(t => t.trim()).filter(Boolean);

    const newCanto: Partial<Canto> = {
      nome: reviewData.nome.trim(),
      artista: reviewData.artista.trim() || undefined,
      compositor: reviewData.compositor.trim() || undefined,
      tom: reviewData.tom,
      bpm: typeof reviewData.bpm === 'number' ? reviewData.bpm : undefined,
      compasso: reviewData.compasso,
      tipo: reviewData.tipo,
      season: reviewData.season,
      ano: reviewData.ano,
      letra: reviewData.letra,
      chordPro: chordPro,
      tags: tagsArray,
      fonte: reviewData.fonte,
      idExterno: reviewData.idExterno,
      urlOriginal: reviewData.urlOriginal,
      dataImportacao: new Date().toISOString(),
      versoes: [
        {
          id: `v_${Date.now()}`,
          nomeVersao: reviewData.nomeVersao || 'Versão Original',
          tom: reviewData.tom,
          letra: reviewData.letra,
          chordPro: chordPro,
          bpm: typeof reviewData.bpm === 'number' ? reviewData.bpm : undefined,
          compasso: reviewData.compasso,
          fonte: reviewData.fonte,
          urlOriginal: reviewData.urlOriginal,
          dataCriacao: new Date().toISOString()
        }
      ]
    };

    onSaveCanto(newCanto);
    showNotification(`"${reviewData.nome}" foi salva com sucesso na sua Biblioteca Musical!`, 'success');
    setIsReviewOpen(false);
    setIsPreviewOpen(false);
    onClose();
  };

  // Handle saving as an additional version to an existing song
  const handleSaveAsNewVersion = (targetCanto: Canto) => {
    const chordPro = textToChordPro(reviewData.letra);
    const newVersion: CantoVersao = {
      id: `v_${Date.now()}`,
      nomeVersao: reviewData.nomeVersao || `Versão (${reviewData.fonte || 'Importada'})`,
      tom: reviewData.tom,
      letra: reviewData.letra,
      chordPro: chordPro,
      bpm: typeof reviewData.bpm === 'number' ? reviewData.bpm : targetCanto.bpm,
      compasso: reviewData.compasso || targetCanto.compasso,
      fonte: reviewData.fonte,
      urlOriginal: reviewData.urlOriginal,
      dataCriacao: new Date().toISOString()
    };

    const existingVersions = targetCanto.versoes || [];
    const updatedVersions = [...existingVersions, newVersion];

    onSaveCanto({
      id: targetCanto.id,
      versoes: updatedVersions,
      updatedAt: new Date().toISOString()
    });

    showNotification(`Nova versão "${newVersion.nomeVersao}" vinculada ao canto "${targetCanto.nome}"!`, 'success');
    setIsDuplicateModalOpen(false);
    setIsReviewOpen(false);
    onClose();
  };

  // Handle Document Upload (PDF, Word DOCX/DOC, ChordPro, TXT)
  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedDocFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setDocFileBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeDocument = async () => {
    if (!docFileBase64 || !selectedDocFile) {
      showNotification('Selecione um arquivo PDF ou Word primeiro.', 'info');
      return;
    }

    setIsAnalyzingDoc(true);
    setDocStatusMsg(`Lendo e analisando "${selectedDocFile.name}" com IA...`);

    try {
      const res = await fetch('/api/ai/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: docFileBase64,
          fileName: selectedDocFile.name,
          mimeType: selectedDocFile.type || 'application/octet-stream'
        })
      });

      if (!res.ok) throw new Error('Falha ao processar documento.');
      const data = await res.json();

      setReviewData({
        nome: data.nome || selectedDocFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
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
        fonte: `Arquivo: ${selectedDocFile.name}`,
        nomeVersao: 'Versão do Documento'
      });

      setIsReviewOpen(true);
      showNotification(`Arquivo "${selectedDocFile.name}" analisado com sucesso!`, 'success');
    } catch (err: any) {
      console.error("Erro no processamento do documento:", err);
      showNotification('Falha ao processar arquivo. Verifique o documento e tente novamente.', 'error');
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
        letra: data.letra || pastedText,
        tags: 'importado, colar-cifra',
        fonte: 'Colar Cifra',
        nomeVersao: 'Versão Importada'
      });

      setIsReviewOpen(true);
    } catch (err) {
      console.warn("Fallback de parser local:", err);
      // Fallback: local heuristic extraction
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

  // Analyze URL for direct import legality and compliance
  const handleAnalyzeLink = async () => {
    if (!linkInput.trim()) {
      showNotification('Cole o link da música ou cifra.', 'info');
      return;
    }

    setIsAnalyzingLink(true);
    setLinkAnalysis(null);

    try {
      const res = await fetch('/api/music/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput })
      });

      if (!res.ok) throw new Error('Falha ao analisar URL.');
      const data: LinkAnalysisResult = await res.json();
      setLinkAnalysis(data);

      if (data.detectedTitle) {
        setSearchQuery(`${data.detectedTitle} ${data.detectedArtist || ''}`);
      }
    } catch (err) {
      console.error("Erro ao analisar link:", err);
      showNotification('Não foi possível verificar este link.', 'error');
    } finally {
      setIsAnalyzingLink(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        id="search-import-modal-container"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-100">
                  BUSCAR MÚSICAS E CIFRAS
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setShowProvidersPopover(!showProvidersPopover)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>{providersList.filter(p => p.enabled).length} Provedores Conectados</span>
                    <Info className="w-3 h-3 text-emerald-400/80" />
                  </button>

                  {/* Provedores Popover */}
                  {showProvidersPopover && (
                    <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-slate-200">
                        <span>Provedores Ativos</span>
                        <span className="text-[10px] text-emerald-400 font-normal">Verificados</span>
                      </div>
                      {providersList.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
                          <div>
                            <p className="font-medium text-slate-100">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.description}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                            {p.enabled ? 'Ativo' : 'Desativado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pesquise na sua biblioteca e em provedores reais autorizados (Apple Music/iTunes, MusicBrainz, Acervo Litúrgico e referências).
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

          {/* TAB 1: BUSCAR MÚSICAS E CIFRAS */}
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
                      placeholder="Pesquise por nome da música, artista, compositor ou trecho da letra..."
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
                    className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    <span>Pesquisar</span>
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center justify-between flex-wrap gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Filtrar:
                    </span>
                    <button
                      onClick={() => setSearchFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Todas as Fontes ({internalResults.length + externalResults.length})
                    </button>
                    <button
                      onClick={() => setSearchFilter('library')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'library'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Minha Biblioteca ({internalResults.length})
                    </button>
                    <button
                      onClick={() => setSearchFilter('liturgical')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'liturgical'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Acervo Litúrgico ({externalResults.filter(r => r.providerId === 'community-catalog').length})
                    </button>
                    <button
                      onClick={() => setSearchFilter('external')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        searchFilter === 'external'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Provedores Externos ({externalResults.filter(r => r.providerId !== 'community-catalog').length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500">
                    <span>Sugestões:</span>
                    {['Segura na Mão de Deus', 'Glória', 'Cordeiro', 'Shalom'].map((sug) => (
                      <button
                        key={sug}
                        onClick={() => {
                          setSearchQuery(sug);
                          handleExecuteSearch(sug);
                        }}
                        className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status or Loading */}
              {isSearching && (
                <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-sm font-medium text-slate-200">
                    Consultando Minha Biblioteca e Provedores Conectados em tempo real...
                  </p>
                  <p className="text-xs text-slate-400">
                    Apple iTunes, MusicBrainz, Acervo Litúrgico Comunitário e Cifra Club.
                  </p>
                </div>
              )}

              {/* 1. Internal Results Section (Minha Biblioteca Musical) */}
              {!isSearching && (searchFilter === 'all' || searchFilter === 'library') && internalResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      1. Encontrado na Minha Biblioteca Musical ({internalResults.length})
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Já cadastrado no seu repertório
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {internalResults.map(item => (
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
              )}

              {/* 2. External & Multi-provider Results Section */}
              {!isSearching && (searchFilter === 'all' || searchFilter === 'liturgical' || searchFilter === 'external') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      2. Provedores Externos & Acervo ({
                        externalResults.filter(r => {
                          if (searchFilter === 'liturgical') return r.providerId === 'community-catalog';
                          if (searchFilter === 'external') return r.providerId !== 'community-catalog';
                          return true;
                        }).length
                      })
                    </h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Fontes verificadas e transparentes
                    </span>
                  </div>

                  {externalResults.length === 0 && internalResults.length === 0 ? (
                    <div className="p-8 text-center bg-slate-800/20 rounded-xl border border-slate-800 text-slate-400 text-sm">
                      Nenhum resultado encontrado para "{searchQuery}". Tente usar as abas <strong>"Colar Cifra"</strong> ou <strong>"Arquivo (PDF/Word)"</strong> para importar imediatamente.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {externalResults
                        .filter(r => {
                          if (searchFilter === 'liturgical') return r.providerId === 'community-catalog';
                          if (searchFilter === 'external') return r.providerId !== 'community-catalog';
                          return true;
                        })
                        .map((item) => (
                        <div 
                          key={`ext_${item.providerId}_${item.id}`}
                          className="p-4 bg-slate-800/50 border border-slate-700/70 hover:border-amber-500/40 rounded-xl transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              {item.albumCoverUrl && (
                                <img 
                                  src={item.albumCoverUrl} 
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
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold rounded shrink-0">
                                {item.key ? `Tom: ${item.key}` : 'Cifra'}
                              </span>
                            </div>

                            <div className="mt-2 space-y-1 text-xs text-slate-300">
                              {item.composer && <p><strong className="text-slate-400">Compositor:</strong> {item.composer}</p>}
                              <p className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-slate-400">Fonte:</strong> 
                                <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                  item.providerId === 'community-catalog' 
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                    : item.providerId === 'itunes'
                                    ? 'bg-pink-500/10 text-pink-300 border border-pink-500/20'
                                    : item.providerId === 'musicbrainz'
                                    ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                }`}>
                                  {item.providerName}
                                </span>
                              </p>
                            </div>

                            {item.previewLyrics && (
                              <p className="mt-2 text-xs text-slate-400 italic line-clamp-2 bg-slate-900/50 p-2 rounded border border-slate-800/80">
                                "{item.previewLyrics}"
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2.5 text-xs flex-wrap">
                              {item.suggestedMoment && (
                                <span className="px-2 py-0.5 bg-slate-700/50 text-slate-200 rounded">
                                  {item.suggestedMoment}
                                </span>
                              )}
                              {item.suggestedSeason && (
                                <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded">
                                  {item.suggestedSeason}
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
                                  className="px-2 py-0.5 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded flex items-center gap-1 hover:bg-pink-500/30 transition-colors"
                                >
                                  {activeAudioPreview === item.audioPreviewUrl ? (
                                    <>
                                      <Pause className="w-3 h-3" />
                                      <span>Pausar Prévia</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3 h-3" />
                                      <span>Ouvir 30s</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons transparently adapted to provider capability */}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/60">
                            <button
                              id={`btn-view-chord-${item.id}`}
                              onClick={() => handleOpenPreview(item)}
                              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              Visualizar
                            </button>

                            {item.isImportable ? (
                              <button
                                id={`btn-import-library-${item.id}`}
                                onClick={() => handleInitiateImport(item)}
                                className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Importar para Biblioteca
                              </button>
                            ) : item.externalUrl ? (
                              <a
                                href={item.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors text-center"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abrir na Fonte
                              </a>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveTab('paste');
                                  setPastedText(`${item.title}\n${item.artist}\n`);
                                }}
                                className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-amber-400" />
                                Estruturar Cifra
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: ARQUIVOS PDF & WORD (DOCX/DOC/TXT/CHORDPRO) */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <UploadCloud className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-100 flex items-center gap-2">
                    Importação de Arquivos PDF e Word
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold">
                      IA Maestro Ativada
                    </span>
                  </p>
                  <p>
                    Envie livretos de cantos, partituras em <strong>PDF</strong>, documentos do <strong>Microsoft Word (.docx, .doc)</strong> ou arquivos de texto (.txt, .chordpro). A inteligência artificial extrairá o texto, alinhará os acordes e classificará o momento e tempo litúrgico.
                  </p>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-8 text-center space-y-4 bg-slate-950/60 transition-colors">
                <div className="flex justify-center items-center gap-3 text-amber-400">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
                    <UploadCloud className="w-10 h-10 text-blue-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-slate-100">
                    {selectedDocFile ? selectedDocFile.name : 'Arraste seu arquivo PDF ou Word aqui'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Formatos suportados: <strong>.PDF</strong> (Adobe Acrobat), <strong>.DOCX / .DOC</strong> (Word), <strong>.CHORDPRO</strong>, <strong>.TXT</strong>
                  </p>
                </div>

                <input
                  type="file"
                  id="input-file-doc-import"
                  accept=".pdf,.docx,.doc,.txt,.chordpro,.cpro,.cho,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                  onChange={handleDocumentFileChange}
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

          {/* TAB 2: COLAR CIFRA (Manual & Fast) */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-100">
                    Importação Manual Rápida com Identificação Automática
                  </p>
                  <p>
                    Copie a cifra de qualquer portal (incluindo Cifra Club, Hinários ou PDFs) e cole abaixo. O sistema identificará automaticamente o <strong>título</strong>, <strong>tom</strong>, <strong>letra</strong>, <strong>acordes</strong>, <strong>refrão</strong>, <strong>estrofes</strong>, <strong>introdução</strong>, <strong>ponte</strong> e <strong>final</strong>.
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
                  <span>Analisar e Pré-visualizar</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORTAR POR LINK */}
          {activeTab === 'link' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-amber-400" />
                  Importar ou Analisar Link de Música
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Insira o link de uma cifra ou música. O sistema verificará se a fonte disponibiliza API autorizada de importação direta, mantendo a conformidade com os termos de uso.
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
          <span>Provedores integrados: Acervo Canônico CNBB, Hinários Litúrgicos e Motor Harmônico IA</span>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL 2: VISUALIZAR CIFRA (Modal de Pré-visualização com Transposição)
          ========================================================================= */}
      {isPreviewOpen && previewSong && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Preview Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Music className="w-5 h-5 text-amber-400" />
                  {previewSong.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Artista: {previewSong.artist} {previewSong.composer ? `• Compositor: ${previewSong.composer}` : ''} • Fonte: {previewSong.source}
                </p>
              </div>

              {/* Transpose Tool on Preview */}
              <div className="flex items-center gap-3">
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
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body with Rendered Chords */}
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

            {/* Preview Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Voltar à Lista
              </button>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  handleInitiateImport(previewSong);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
              >
                <Download className="w-4 h-4" />
                Importar para Minha Biblioteca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: TELA DE CONFERÊNCIA ANTES DE SALVAR (Review Screen)
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
                  <h3 className="text-lg font-bold text-slate-100">Conferência & Revisão Musical</h3>
                  <p className="text-xs text-slate-400">
                    Revise os dados antes de salvar definitivamente na sua Biblioteca Musical.
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

              {/* Version label */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nome desta Versão de Cifra
                  </label>
                  <input
                    type="text"
                    value={reviewData.nomeVersao}
                    onChange={(e) => setReviewData({ ...reviewData, nomeVersao: e.target.value })}
                    placeholder="Ex: Versão Original, Versão Ministério, Versão Acústica"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Fonte da Música
                  </label>
                  <input
                    type="text"
                    value={reviewData.fonte}
                    onChange={(e) => setReviewData({ ...reviewData, fonte: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Chords & Lyrics Preview / Edit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Letra & Cifra Estruturada
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditingReview(!isEditingReview)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditingReview ? 'Modo Visualização' : 'Editar Cifra'}
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
                    {reviewData.letra}
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Editar, Cancelar, Salvar na Minha Biblioteca */}
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
          MODAL 4: DETECÇÃO DE DUPLICIDADE (Anti-Duplicate Resolution)
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

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Star, 
  Music, 
  Edit, 
  Trash2, 
  Eye, 
  PlusCircle, 
  SlidersHorizontal, 
  BookOpen, 
  Filter, 
  ArrowUpDown, 
  Music2, 
  Share2, 
  Check, 
  Sparkles,
  Layers,
  Clock,
  Tag
} from 'lucide-react';
import { Canto, AgendaItem, SeasonInfo } from '../types';
import { NOTES_SHARP, NOTES_FLAT, NOTE_MAP } from '../constants';
import { transposeChord } from '../lib/chordPro';

interface MusicLibraryProps {
  cantos: Canto[];
  agenda: AgendaItem[];
  categorias: string[];
  temposLiturgicos: SeasonInfo[];
  onOpenStageMode: (canto: Canto) => void;
  onEditCanto: (canto: Canto) => void;
  onDeleteCanto: (canto: Canto) => void;
  onToggleFavorite: (cantoId: string | number) => void;
  onOpenImport: () => void;
  onOpenNewCanto: () => void;
  onAddToRepertoire: (canto: Canto, agendaId: string | number, tomUtilizado: string, momento?: string) => void;
}

export function MusicLibrary({
  cantos,
  agenda,
  categorias,
  temposLiturgicos,
  onOpenStageMode,
  onEditCanto,
  onDeleteCanto,
  onToggleFavorite,
  onOpenImport,
  onOpenNewCanto,
  onAddToRepertoire
}: MusicLibraryProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMoment, setSelectedMoment] = useState<string>('todos');
  const [selectedSeason, setSelectedSeason] = useState<string>('todos');
  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('todos');

  // Quick Add to Repertoire Modal State
  const [targetCantoForRepertoire, setTargetCantoForRepertoire] = useState<Canto | null>(null);
  const [selectedAgendaId, setSelectedAgendaId] = useState<string>('');
  const [customKeyForRepertoire, setCustomKeyForRepertoire] = useState<string>('');
  const [customMomentForRepertoire, setCustomMomentForRepertoire] = useState<string>('');

  // Quick Live Key Transpose State (Temporary live check without modifying original)
  const [quickTransposeCanto, setQuickTransposeCanto] = useState<Canto | null>(null);
  const [quickTransposeKey, setQuickTransposeKey] = useState<string>('');

  // Filter Logic
  const filteredCantos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return cantos.filter(c => {
      // 1. Search Query (Matches title, artist, composer, tags, type, lyrics)
      if (term) {
        const matchesName = c.nome.toLowerCase().includes(term);
        const matchesArtist = c.artista ? c.artista.toLowerCase().includes(term) : false;
        const matchesComposer = c.compositor ? c.compositor.toLowerCase().includes(term) : false;
        const matchesTipo = c.tipo ? c.tipo.toLowerCase().includes(term) : false;
        const matchesSeason = c.season ? c.season.toLowerCase().includes(term) : false;
        const matchesLyrics = c.letra ? c.letra.toLowerCase().includes(term) : false;
        const matchesTags = c.tags ? c.tags.some(t => t.toLowerCase().includes(term)) : false;

        if (!matchesName && !matchesArtist && !matchesComposer && !matchesTipo && !matchesSeason && !matchesLyrics && !matchesTags) {
          return false;
        }
      }

      // 2. Moment filter
      if (selectedMoment !== 'todos') {
        const hasMoment = c.tipo === selectedMoment || (c.momentos && c.momentos.includes(selectedMoment));
        if (!hasMoment) return false;
      }

      // 3. Season filter
      if (selectedSeason !== 'todos' && c.season !== selectedSeason) {
        return false;
      }

      // 4. Year filter
      if (selectedYear !== 'todos' && c.ano !== selectedYear) {
        return false;
      }

      // 5. Favorites filter
      if (onlyFavorites && !c.isFavorite) {
        return false;
      }

      // 6. Key filter
      if (selectedKey !== 'todos') {
        if (!c.tom || !c.tom.startsWith(selectedKey)) return false;
      }

      return true;
    });
  }, [cantos, searchTerm, selectedMoment, selectedSeason, selectedYear, onlyFavorites, selectedKey]);

  // Open modal to add song to a celebration
  const handleOpenAddRepertoireModal = (canto: Canto) => {
    setTargetCantoForRepertoire(canto);
    setCustomKeyForRepertoire(canto.tom || 'C');
    setCustomMomentForRepertoire(canto.tipo || 'Comunhão');
    if (agenda.length > 0) {
      setSelectedAgendaId(String(agenda[0].id));
    }
  };

  const handleConfirmAddToRepertoire = () => {
    if (!targetCantoForRepertoire || !selectedAgendaId) return;
    onAddToRepertoire(
      targetCantoForRepertoire,
      selectedAgendaId,
      customKeyForRepertoire,
      customMomentForRepertoire
    );
    setTargetCantoForRepertoire(null);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Music className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Biblioteca Musical
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {filteredCantos.length} {filteredCantos.length === 1 ? 'música encontrada' : 'músicas encontradas'} de {cantos.length} no acervo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="lib-btn-import"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            Importar Cifra
          </button>

          <button
            id="lib-btn-new-canto"
            onClick={onOpenNewCanto}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Música
          </button>
        </div>
      </div>

      {/* SEARCH BAR (Section 9) */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input 
          id="lib-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔎 Buscar música ou cifra por título, artista, momento, tempo, tom ou letra..."
          className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            Limpar
          </button>
        )}
      </div>

      {/* FILTER CONTROLS */}
      <div className="space-y-3">
        {/* Momentos Litúrgicos Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedMoment('todos')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedMoment === 'todos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            Todos os Momentos
          </button>

          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedMoment(cat === selectedMoment ? 'todos' : cat)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedMoment === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row: Tempos, Ano, Tom & Favoritas */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Season Filter Dropdown */}
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos os Tempos Litúrgicos</option>
            {temposLiturgicos.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {/* Liturgical Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos os Anos (A/B/C)</option>
            <option value="A">Ano A</option>
            <option value="B">Ano B</option>
            <option value="C">Ano C</option>
            <option value="Geral">Geral / Solene</option>
          </select>

          {/* Key Filter */}
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos os Tons</option>
            {NOTES_SHARP.map(n => (
              <option key={n} value={n}>Tom {n}</option>
            ))}
          </select>

          {/* Only Favorites Button */}
          <button
            onClick={() => setOnlyFavorites(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              onlyFavorites
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-white' : 'text-amber-500'}`} />
            Apenas Favoritas
          </button>
        </div>
      </div>

      {/* RESULTS LIST (Section 10) */}
      {filteredCantos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCantos.map((canto) => {
            return (
              <div
                key={canto.id}
                id={`canto-card-${canto.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-4"
              >
                {/* Top Title & Metadata */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                        {canto.nome}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Artista: <span className="text-slate-700 dark:text-slate-300 font-semibold">{canto.artista || 'Tradicional Católico'}</span>
                        {canto.compositor && ` • Comp: ${canto.compositor}`}
                      </p>
                    </div>

                    {/* Star Favorite Button */}
                    <button
                      onClick={() => onToggleFavorite(canto.id)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                        canto.isFavorite
                          ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={canto.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      <Star className={`w-4 h-4 ${canto.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Badges: Moment, Season, Key, BPM */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {/* Key Badge */}
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-900">
                      Tom: {canto.tom || 'C'}
                    </span>

                    {/* Liturgical Moment Badge */}
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                      {canto.tipo || 'Momento'}
                    </span>

                    {/* Liturgical Season Badge */}
                    {canto.season && (
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        {canto.season}
                      </span>
                    )}

                    {/* Year badge if applicable */}
                    {canto.ano && canto.ano !== 'Geral' && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                        Ano {canto.ano}
                      </span>
                    )}

                    {/* Rhythm / BPM */}
                    {canto.bpm && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
                        ♩ {canto.bpm} BPM
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar (Section 10 buttons: Visualizar | Alterar Tom | Adicionar ao Repertório | Editar) */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    
                    {/* VISUALIZAR */}
                    <button
                      id={`btn-view-canto-${canto.id}`}
                      onClick={() => onOpenStageMode(canto)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </button>

                    {/* ALTERAR TOM (Quick preview) */}
                    <button
                      id={`btn-transpose-canto-${canto.id}`}
                      onClick={() => {
                        setQuickTransposeCanto(canto);
                        setQuickTransposeKey(canto.tom || 'C');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                      Alterar Tom
                    </button>

                    {/* ADICIONAR AO REPERTÓRIO */}
                    <button
                      id={`btn-add-repertoire-${canto.id}`}
                      onClick={() => handleOpenAddRepertoireModal(canto)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
                      title="Adicionar esta música à escala de uma celebração"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ao Repertório
                    </button>
                  </div>

                  {/* Edit & Delete Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCanto(canto)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar música"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteCanto(canto)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Excluir música"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <Music2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhuma música encontrada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || selectedMoment !== 'todos' || selectedSeason !== 'todos'
              ? 'Tente remover alguns filtros ou buscar por outro termo.'
              : 'Comece adicionando ou importando músicas e cifras litúrgicas.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={onOpenImport}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
            >
              Importar Cifra
            </button>
            <button
              onClick={onOpenNewCanto}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Cadastrar Manualmente
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD TO REPERTOIRE MODAL */}
      {targetCantoForRepertoire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Adicionar ao Repertório
                </h3>
              </div>
              <button 
                onClick={() => setTargetCantoForRepertoire(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {targetCantoForRepertoire.nome}
              </p>
              <p className="text-xs text-slate-500">
                Tom Original no Acervo: <strong className="text-blue-600">{targetCantoForRepertoire.tom || 'C'}</strong>
              </p>
            </div>

            {agenda.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Selecione a Celebração / Missa:
                  </label>
                  <select
                    value={selectedAgendaId}
                    onChange={(e) => setSelectedAgendaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {agenda.map(a => (
                      <option key={a.id} value={String(a.id)}>
                        {a.titulo} ({a.local || 'Paróquia'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Momento na Celebração:
                    </label>
                    <select
                      value={customMomentForRepertoire}
                      onChange={(e) => setCustomMomentForRepertoire(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {categorias.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Tom Nesta Celebração:
                    </label>
                    <select
                      value={customKeyForRepertoire}
                      onChange={(e) => setCustomKeyForRepertoire(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400"
                    >
                      {NOTES_SHARP.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  💡 <em>O tom escolhido será salvo exclusivamente para esta celebração, sem alterar o tom padrão da Biblioteca.</em>
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setTargetCantoForRepertoire(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmAddToRepertoire}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    Confirmar e Adicionar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-500">
                  Nenhuma celebração cadastrada na agenda ainda.
                </p>
                <button
                  onClick={() => setTargetCantoForRepertoire(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"
                >
                  Fechar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* QUICK LIVE KEY TRANSPOSE MODAL */}
      {quickTransposeCanto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Transpor Tonalidade
                </h3>
              </div>
              <button 
                onClick={() => setQuickTransposeCanto(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{quickTransposeCanto.nome}</p>
                <p className="text-xs text-slate-500">Tom original cadastrado: <strong className="text-blue-600">{quickTransposeCanto.tom || 'C'}</strong></p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Escolha o Novo Tom:</label>
                <div className="grid grid-cols-6 gap-2">
                  {NOTES_SHARP.map(n => (
                    <button
                      key={n}
                      onClick={() => setQuickTransposeKey(n)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        quickTransposeKey === n
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setQuickTransposeCanto(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const cantoCopy = { ...quickTransposeCanto, tomUtilizado: quickTransposeKey };
                    setQuickTransposeCanto(null);
                    onOpenStageMode(cantoCopy);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Visualizar em {quickTransposeKey}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Play, 
  Download, 
  Trash2, 
  Edit, 
  ArrowUp, 
  ArrowDown, 
  Music, 
  Sparkles, 
  Users, 
  FileText, 
  CheckCircle, 
  Eye, 
  Wifi, 
  WifiOff, 
  Sliders, 
  Loader2,
  ChevronRight,
  Share2
} from 'lucide-react';
import { AgendaItem, Canto, RepertorioItem, EscalaMembro, SeasonInfo } from '../types';
import { NOTES_SHARP, NOTE_MAP, INSTRUMENT_OPTIONS } from '../constants';
import { generateFolhetoPDF, generateRepertoirePDF } from '../lib/pdfGenerator';
import { saveRepertoireOffline, isRepertoireCachedOffline, removeOfflinePackage } from '../lib/offlineStorage';
import { FolhetoModal } from './FolhetoModal';

interface RepertoireManagerProps {
  agenda: AgendaItem[];
  cantos: Canto[];
  temposLiturgicos: SeasonInfo[];
  categorias: string[];
  onOpenStageMode: (canto: Canto, agenda?: AgendaItem, index?: number) => void;
  onUpdateAgenda: (updatedItem: AgendaItem) => void;
  onDeleteAgenda: (agendaItem: AgendaItem) => void;
  onOpenNewCelebration: () => void;
  onOpenEditCelebration: (item: AgendaItem) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function RepertoireManager({
  agenda,
  cantos,
  temposLiturgicos,
  categorias,
  onOpenStageMode,
  onUpdateAgenda,
  onDeleteAgenda,
  onOpenNewCelebration,
  onOpenEditCelebration,
  showNotification
}: RepertoireManagerProps) {
  
  const [selectedCelebrationId, setSelectedCelebrationId] = useState<string | number>(
    agenda.length > 0 ? agenda[0].id : ''
  );

  const [isFolhetoModalOpen, setIsFolhetoModalOpen] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestionModal, setAiSuggestionModal] = useState<{
    justificativa: string;
    sugestoes: { momento: string; cantoId?: string; nome: string; tomSugerido?: string; motivo?: string }[];
  } | null>(null);

  // Add Song to Current Celebration Modal
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [songToAddId, setSongToAddId] = useState<string | number>('');
  const [songToAddMoment, setSongToAddMoment] = useState<string>('Entrada');
  const [songToAddKey, setSongToAddKey] = useState<string>('C');

  // Active Celebration
  const currentCelebration = agenda.find(a => String(a.id) === String(selectedCelebrationId)) || agenda[0] || null;

  // Format Repertoire items
  const repertoireItems: RepertorioItem[] = currentCelebration?.repertorio && currentCelebration.repertorio.length > 0
    ? currentCelebration.repertorio
    : (currentCelebration?.cantosIds || []).map((cid, idx) => {
        const found = cantos.find(c => String(c.id) === String(cid));
        return {
          cantoId: cid,
          momento: found?.tipo || 'Momento',
          tom: found?.tom || 'C',
          ordem: idx + 1
        };
      });

  // Reorder Items
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!currentCelebration) return;
    const newItems = [...repertoireItems];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    // Update order numbers
    newItems.forEach((it, i) => it.ordem = i + 1);

    const updated: AgendaItem = {
      ...currentCelebration,
      repertorio: newItems,
      cantosIds: newItems.map(i => i.cantoId),
      updatedAt: new Date().toISOString()
    };
    onUpdateAgenda(updated);
  };

  // Change Specific Key for this celebration only (Section 18)
  const handleChangeSpecificKey = (index: number, newKey: string) => {
    if (!currentCelebration) return;
    const newItems = [...repertoireItems];
    newItems[index] = {
      ...newItems[index],
      tom: newKey
    };

    const updated: AgendaItem = {
      ...currentCelebration,
      repertorio: newItems,
      updatedAt: new Date().toISOString()
    };
    onUpdateAgenda(updated);
    showNotification(`Tom alterado para ${newKey} nesta celebração.`, 'info');
  };

  // Change Moment
  const handleChangeMoment = (index: number, newMoment: string) => {
    if (!currentCelebration) return;
    const newItems = [...repertoireItems];
    newItems[index] = {
      ...newItems[index],
      momento: newMoment
    };

    const updated: AgendaItem = {
      ...currentCelebration,
      repertorio: newItems,
      updatedAt: new Date().toISOString()
    };
    onUpdateAgenda(updated);
  };

  // Remove Song from Repertoire
  const handleRemoveItem = (index: number) => {
    if (!currentCelebration) return;
    const newItems = repertoireItems.filter((_, i) => i !== index);
    newItems.forEach((it, i) => it.ordem = i + 1);

    const updated: AgendaItem = {
      ...currentCelebration,
      repertorio: newItems,
      cantosIds: newItems.map(i => i.cantoId),
      updatedAt: new Date().toISOString()
    };
    onUpdateAgenda(updated);
    showNotification('Música removida do repertório.', 'info');
  };

  // Add Song Confirmed
  const handleConfirmAddSong = () => {
    if (!currentCelebration || !songToAddId) return;
    const found = cantos.find(c => String(c.id) === String(songToAddId));
    if (!found) return;

    const newItem: RepertorioItem = {
      cantoId: found.id,
      momento: songToAddMoment || found.tipo || 'Momento',
      tom: songToAddKey || found.tom || 'C',
      ordem: repertoireItems.length + 1
    };

    const newItems = [...repertoireItems, newItem];
    const updated: AgendaItem = {
      ...currentCelebration,
      repertorio: newItems,
      cantosIds: newItems.map(i => i.cantoId),
      updatedAt: new Date().toISOString()
    };
    onUpdateAgenda(updated);
    setIsAddSongModalOpen(false);
    showNotification(`"${found.nome}" adicionada ao repertório em ${newItem.tom}!`, 'success');
  };

  // Offline Package Toggle (Section 26)
  const isOfflineSaved = currentCelebration ? isRepertoireCachedOffline(currentCelebration.id) : false;

  const handleToggleOffline = () => {
    if (!currentCelebration) return;
    if (isOfflineSaved) {
      removeOfflinePackage(currentCelebration.id);
      showNotification('Repertório removido do cache offline.', 'info');
    } else {
      saveRepertoireOffline(currentCelebration, cantos);
      showNotification('Repertório e cifras baixados com sucesso para uso offline!', 'success');
    }
  };

  // PDF Export Handlers (Section 24 & Modo Folheto)
  const handleExportPdfSummary = () => {
    if (!currentCelebration) return;
    generateFolhetoPDF({
      agenda: currentCelebration,
      cantos,
      mode: 'lyrics'
    });
    showNotification('Folheto Somente Letras gerado em PDF!', 'success');
  };

  const handleExportPdfFullChords = () => {
    if (!currentCelebration) return;
    generateFolhetoPDF({
      agenda: currentCelebration,
      cantos,
      mode: 'chords'
    });
    showNotification('Folheto Completo com Cifras gerado em PDF!', 'success');
  };

  // AI Repertoire Suggestion (Section 28)
  const handleRequestAiSuggestion = async () => {
    if (!currentCelebration) return;
    setIsAiSuggesting(true);
    try {
      const response = await fetch('/api/ai/suggest-repertoire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          celebrationTitle: currentCelebration.titulo,
          season: currentCelebration.season || 'Tempo Comum',
          availableSongs: cantos
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao obter sugestão da IA.');
      }

      const data = await response.json();
      setAiSuggestionModal(data);
    } catch (err: any) {
      showNotification('Não foi possível gerar sugestão por IA no momento.', 'error');
    } finally {
      setIsAiSuggesting(false);
    }
  };

  // Apply AI Suggestion to Repertoire
  const handleApplyAiSuggestion = () => {
    if (!currentCelebration || !aiSuggestionModal) return;
    
    const newItems: RepertorioItem[] = [];
    aiSuggestionModal.sugestoes.forEach((sug, idx) => {
      // Find matching song in library
      let match = cantos.find(c => String(c.id) === String(sug.cantoId));
      if (!match) {
        match = cantos.find(c => c.nome.toLowerCase().includes(sug.nome.toLowerCase()));
      }

      if (match) {
        newItems.push({
          cantoId: match.id,
          momento: sug.momento,
          tom: sug.tomSugerido || match.tom || 'C',
          ordem: idx + 1
        });
      }
    });

    if (newItems.length > 0) {
      const updated: AgendaItem = {
        ...currentCelebration,
        repertorio: newItems,
        cantosIds: newItems.map(i => i.cantoId),
        updatedAt: new Date().toISOString()
      };
      onUpdateAgenda(updated);
      showNotification(`${newItems.length} músicas sugeridas foram aplicadas ao repertório!`, 'success');
    } else {
      showNotification('Nenhuma música compatível encontrada no acervo para aplicar.', 'info');
    }
    setAiSuggestionModal(null);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header and Celebration Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Repertórios Litúrgicos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize a ordem dos cantos, defina o tom específico para a celebração e escale os músicos.
          </p>
        </div>

        <button
          id="rep-btn-nova-celebracao"
          onClick={onOpenNewCelebration}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Celebração
        </button>
      </div>

      {/* Celebration Selector Tabs / Dropdown */}
      {agenda.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Celebração Ativa:
              </label>
              <select
                id="select-celebration-active"
                value={currentCelebration?.id || ''}
                onChange={(e) => setSelectedCelebrationId(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {agenda.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.titulo} ({item.data ? new Date(item.data).toLocaleDateString('pt-BR') : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Top Celebration Actions */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* MODO FOLHETO BUTTON (PROMINENT) */}
              <button
                id="btn-open-folheto-modal"
                onClick={() => setIsFolhetoModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                title="Abrir o Modo Folheto (Visualizar, Imprimir e Baixar PDF com Letras ou Cifras)"
              >
                <FileText className="w-4 h-4 text-blue-200" />
                📄 Modo Folheto
              </button>

              {/* STAGE MODE PLAY */}
              <button
                id="btn-open-stage-celebration"
                onClick={() => {
                  const firstSong = cantos.find(c => String(c.id) === String(repertoireItems[0]?.cantoId));
                  if (firstSong) {
                    onOpenStageMode(firstSong, currentCelebration, 0);
                  } else {
                    showNotification('Adicione músicas ao repertório primeiro.', 'info');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer border border-slate-700"
                title="Abrir todas as músicas no Modo Palco para a celebração"
              >
                <Play className="w-4 h-4 fill-white" />
                Modo Palco
              </button>

              {/* OFFLINE TOGGLE BUTTON */}
              <button
                id="btn-toggle-offline-celebration"
                onClick={handleToggleOffline}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isOfflineSaved
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
                title="Armazenar cifras no aparelho para tocar sem internet na igreja"
              >
                {isOfflineSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Offline Pronto
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-slate-500" />
                    Baixar Offline
                  </>
                )}
              </button>

              {/* PDF QUICK EXPORT BUTTONS */}
              <button
                id="btn-pdf-folheto-lyrics"
                onClick={handleExportPdfSummary}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                title="Baixar PDF do Folheto Somente Letras"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF Letras
              </button>

              <button
                id="btn-pdf-folheto-chords"
                onClick={handleExportPdfFullChords}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800 transition-all cursor-pointer"
                title="Baixar PDF Completo com Cifras no tom do repertório"
              >
                <Download className="w-3.5 h-3.5" />
                PDF Cifras
              </button>

              {/* AI SUGGEST BUTTON */}
              <button
                onClick={handleRequestAiSuggestion}
                disabled={isAiSuggesting}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition-all cursor-pointer disabled:opacity-50"
                title="Pedir sugestão de repertório para esta celebração com IA"
              >
                {isAiSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                Sugerir IA
              </button>
            </div>
          </div>

          {/* Celebration Details Header */}
          {currentCelebration && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {currentCelebration.titulo}
                  </h2>
                  {currentCelebration.tipoCelebracao && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                      {currentCelebration.tipoCelebracao}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    {new Date(currentCelebration.data).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    {currentCelebration.local || 'Paróquia'}
                  </span>
                  {currentCelebration.season && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-blue-600">
                        {currentCelebration.season}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenEditCelebration(currentCelebration)}
                  className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Editar dados da celebração"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteAgenda(currentCelebration)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Excluir celebração"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Musicians Scale Section */}
          {currentCelebration?.escala && currentCelebration.escala.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Escala do Ministério de Música:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentCelebration.escala.map((esc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl text-xs border border-slate-200 dark:border-slate-700 shadow-2xs font-medium text-slate-800 dark:text-slate-200">
                    <strong className="text-blue-600 dark:text-blue-400">{esc.funcao}:</strong> {esc.nome}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* REPERTOIRE LIST TABLE */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Ordem dos Cantos ({repertoireItems.length})
              </h3>

              <button
                id="btn-add-song-to-repertoire"
                onClick={() => {
                  if (cantos.length > 0) {
                    setSongToAddId(cantos[0].id);
                    setSongToAddKey(cantos[0].tom || 'C');
                    setSongToAddMoment(cantos[0].tipo || 'Entrada');
                  }
                  setIsAddSongModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Música ao Repertório
              </button>
            </div>

            {repertoireItems.length > 0 ? (
              <div className="space-y-2">
                {repertoireItems.map((item, idx) => {
                  const song = cantos.find(c => String(c.id) === String(item.cantoId));
                  if (!song) return null;

                  const isCustomKey = item.tom && song.tom && item.tom !== song.tom;

                  return (
                    <div
                      key={`${item.cantoId}-${idx}`}
                      className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      {/* Order & Song Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Order Position Number */}
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(idx, 'up')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={idx === repertoireItems.length - 1}
                            onClick={() => handleMoveItem(idx, 'down')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Song Details */}
                        <div className="min-w-0 space-y-0.5">
                          {/* Moment Dropdown Selector */}
                          <div className="flex items-center gap-2">
                            <select
                              value={item.momento || song.tipo}
                              onChange={(e) => handleChangeMoment(idx, e.target.value)}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-transparent border-b border-dashed border-blue-300 dark:border-blue-700 focus:outline-none cursor-pointer"
                            >
                              {categorias.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {song.nome}
                          </h4>

                          <p className="text-xs text-slate-500 truncate">
                            {song.artista || 'Católico'} • Original: {song.tom || 'C'}
                          </p>
                        </div>
                      </div>

                      {/* Right Controls: SPECIFIC KEY SELECTOR (Section 18) & Actions */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        
                        {/* SPECIFIC KEY CHOOSER */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-500">Tom:</span>
                          <select
                            value={item.tom || song.tom || 'C'}
                            onChange={(e) => handleChangeSpecificKey(idx, e.target.value)}
                            className="font-black text-xs text-blue-600 dark:text-blue-400 bg-transparent focus:outline-none cursor-pointer"
                            title="Escolha o tom específico para esta celebração sem alterar o cadastro original"
                          >
                            {NOTES_SHARP.map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          {isCustomKey && (
                            <span className="text-[9px] px-1 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-bold" title="Tom transposto especificamente para esta missa">
                              Modificado
                            </span>
                          )}
                        </div>

                        {/* Open in Stage Mode for this song */}
                        <button
                          onClick={() => onOpenStageMode(song, currentCelebration, idx)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          title="Abrir cifra no tom desta celebração"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Cifra
                        </button>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remover do repertório"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <Music className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Nenhum canto adicionado a este repertório ainda.
                </p>
                <button
                  onClick={() => setIsAddSongModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Músicas
                </button>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhuma celebração cadastrada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Crie sua primeira celebração ou Missa para montar o repertório litúrgico e a escala de músicos.
          </p>
          <button
            onClick={onOpenNewCelebration}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
          >
            Criar Nova Celebração
          </button>
        </div>
      )}

      {/* ADD SONG MODAL */}
      {isAddSongModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Adicionar Música ao Repertório
              </h3>
              <button 
                onClick={() => setIsAddSongModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Escolha a Música do Acervo:
                </label>
                <select
                  value={songToAddId}
                  onChange={(e) => {
                    setSongToAddId(e.target.value);
                    const found = cantos.find(c => String(c.id) === String(e.target.value));
                    if (found) {
                      setSongToAddKey(found.tom || 'C');
                      setSongToAddMoment(found.tipo || 'Entrada');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  {cantos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.artista || 'Católico'}) - Tom: {c.tom || 'C'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Momento Litúrgico:
                  </label>
                  <select
                    value={songToAddMoment}
                    onChange={(e) => setSongToAddMoment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Tom nesta Celebração:
                  </label>
                  <select
                    value={songToAddKey}
                    onChange={(e) => setSongToAddKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    {NOTES_SHARP.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsAddSongModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAddSong}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI REPERTOIRE SUGGESTION RESULT MODAL */}
      {aiSuggestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Sugestão Litúrgica de Repertório
                </h3>
              </div>
              <button 
                onClick={() => setAiSuggestionModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {aiSuggestionModal.justificativa && (
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 font-medium">
                📖 {aiSuggestionModal.justificativa}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Cantos Recomendados:</p>
              {aiSuggestionModal.sugestoes.map((sug, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-blue-600 dark:text-blue-400">{sug.momento}</span>
                    {sug.tomSugerido && <span className="text-slate-500">Tom: {sug.tomSugerido}</span>}
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">{sug.nome}</p>
                  {sug.motivo && <p className="text-[11px] text-slate-500 italic">{sug.motivo}</p>}
                </div>
              ))}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAiSuggestionModal(null)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                Descartar
              </button>
              <button
                onClick={handleApplyAiSuggestion}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all"
              >
                Aplicar ao Repertório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODO FOLHETO MODAL PREVIEW & DOWNLOAD */}
      <FolhetoModal
        isOpen={isFolhetoModalOpen}
        onClose={() => setIsFolhetoModalOpen(false)}
        agenda={currentCelebration}
        cantos={cantos}
        showNotification={showNotification}
      />

    </div>
  );
}

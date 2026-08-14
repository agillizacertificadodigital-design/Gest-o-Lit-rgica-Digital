/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Music, 
  Check, 
  FileText, 
  Sliders, 
  Sparkles,
  Layers,
  Tag
} from 'lucide-react';
import { Canto, SeasonInfo, NoteOnStaff } from '../types';
import { NOTES_SHARP } from '../constants';
import MusicalStaffEditor from './MusicalStaffEditor';

interface CantoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cantoData: Partial<Canto>) => void;
  editingCanto: Canto | null;
  categorias: string[];
  temposLiturgicos: SeasonInfo[];
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function CantoEditorModal({
  isOpen,
  onClose,
  onSave,
  editingCanto,
  categorias,
  temposLiturgicos,
  showNotification
}: CantoEditorModalProps) {
  
  const [activeTab, setActiveTab] = useState<'cifra' | 'pauta'>('cifra');
  
  const [nome, setNome] = useState('');
  const [artista, setArtista] = useState('');
  const [compositor, setCompositor] = useState('');
  const [tom, setTom] = useState('C');
  const [bpm, setBpm] = useState<number | ''>('');
  const [compasso, setCompasso] = useState('4/4');
  const [tipo, setTipo] = useState('Entrada');
  const [season, setSeason] = useState('Tempo Comum');
  const [ano, setAno] = useState('Geral');
  const [letra, setLetra] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Musical Staff Editor States
  const [sheetNotes, setSheetNotes] = useState<NoteOnStaff[]>([]);
  const [sheetClef, setSheetClef] = useState<'sol' | 'fa' | 'do'>('sol');
  const [sheetCompasso, setSheetCompasso] = useState<string>('4/4');

  useEffect(() => {
    if (editingCanto) {
      setNome(editingCanto.nome || '');
      setArtista(editingCanto.artista || '');
      setCompositor(editingCanto.compositor || '');
      setTom(editingCanto.tom || 'C');
      setBpm(editingCanto.bpm ?? '');
      setCompasso(editingCanto.compasso || '4/4');
      setTipo(editingCanto.tipo || 'Entrada');
      setSeason(editingCanto.season || 'Tempo Comum');
      setAno(editingCanto.ano || 'Geral');
      setLetra(editingCanto.letra || '');
      setTagsInput(editingCanto.tags ? editingCanto.tags.join(', ') : '');

      if (editingCanto.partitura) {
        try {
          const parsed = JSON.parse(editingCanto.partitura);
          if (Array.isArray(parsed)) {
            setSheetNotes(parsed);
            setSheetClef('sol');
            setSheetCompasso(editingCanto.compasso || '4/4');
          } else if (parsed && typeof parsed === 'object') {
            setSheetNotes(parsed.notes || []);
            setSheetClef(parsed.clef || 'sol');
            setSheetCompasso(parsed.compasso || editingCanto.compasso || '4/4');
          }
        } catch {
          setSheetNotes([]);
          setSheetClef('sol');
          setSheetCompasso(editingCanto.compasso || '4/4');
        }
      } else {
        setSheetNotes([]);
        setSheetClef('sol');
        setSheetCompasso(editingCanto.compasso || '4/4');
      }
    } else {
      setNome('');
      setArtista('');
      setCompositor('');
      setTom('C');
      setBpm('');
      setCompasso('4/4');
      setTipo('Entrada');
      setSeason('Tempo Comum');
      setAno('Geral');
      setLetra('');
      setTagsInput('');
      setSheetNotes([]);
      setSheetClef('sol');
      setSheetCompasso('4/4');
    }
  }, [editingCanto, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!nome.trim()) {
      showNotification('O título da música é obrigatório.', 'error');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const partituraData = sheetNotes.length > 0
      ? JSON.stringify({ notes: sheetNotes, clef: sheetClef, compasso: sheetCompasso })
      : undefined;

    onSave({
      id: editingCanto ? editingCanto.id : undefined,
      nome: nome.trim(),
      artista: artista.trim() || 'Católico',
      compositor: compositor.trim(),
      tom: tom || 'C',
      bpm: bpm ? Number(bpm) : undefined,
      compasso: compasso || '4/4',
      tipo: tipo || 'Entrada',
      season: season || 'Tempo Comum',
      ano: (ano as 'A' | 'B' | 'C' | 'Geral') || 'Geral',
      letra: letra.trim(),
      tags,
      partitura: partituraData,
      updatedAt: new Date().toISOString()
    });

    onClose();
    showNotification(`Música "${nome}" salva com sucesso!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-600" />
            <h2 className="font-black text-lg text-slate-900 dark:text-white">
              {editingCanto ? 'Editar Música' : 'Nova Música no Acervo'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab switch: Cifra vs Pauta */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('cifra')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'cifra'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Cifra & Letra
          </button>

          <button
            onClick={() => setActiveTab('pauta')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pauta'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Editor de Pauta Musical
          </button>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Título da Música: *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Segura na Mão de Deus"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tom Original:
            </label>
            <select
              value={tom}
              onChange={(e) => setTom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400"
            >
              {NOTES_SHARP.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Artista / Intérprete:
            </label>
            <input
              type="text"
              value={artista}
              onChange={(e) => setArtista(e.target.value)}
              placeholder="Ex: Nelson Monteiro"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Momento Litúrgico:
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tempo Litúrgico:
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            >
              {temposLiturgicos.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              BPM:
            </label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ex: 95"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Compasso:
            </label>
            <input
              type="text"
              value={compasso}
              onChange={(e) => setCompasso(e.target.value)}
              placeholder="Ex: 4/4 ou 6/8"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Ano Litúrgico:
            </label>
            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="Geral">Geral</option>
              <option value="A">Ano A</option>
              <option value="B">Ano B</option>
              <option value="C">Ano C</option>
            </select>
          </div>
        </div>

        {/* Tab Body: CIFRA */}
        {activeTab === 'cifra' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Cifra e Letra:
            </label>
            <textarea
              value={letra}
              onChange={(e) => setLetra(e.target.value)}
              placeholder="[Intro] C G Am F&#10;&#10;[Verso 1]&#10;C            G&#10;Se as águas do mar da vida..."
              rows={10}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        )}

        {/* Tab Body: PAUTA MUSICAL (Preserved component) */}
        {activeTab === 'pauta' && (
          <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/40">
            <MusicalStaffEditor
              notes={sheetNotes}
              onChange={setSheetNotes}
              clef={sheetClef}
              onChangeClef={setSheetClef}
              compasso={sheetCompasso}
              onChangeCompasso={setSheetCompasso}
              songTitle={nome}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            id="btn-save-canto-editor"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Salvar Música
          </button>
        </div>

      </div>
    </div>
  );
}

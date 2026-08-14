/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Layers, 
  Users, 
  Check, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { AgendaItem, SeasonInfo, Musico } from '../types';
import { INSTRUMENT_OPTIONS } from '../constants';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (celebrationData: Partial<AgendaItem>) => void;
  editingCelebration: AgendaItem | null;
  temposLiturgicos: SeasonInfo[];
  musicos: Musico[];
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function CelebrationModal({
  isOpen,
  onClose,
  onSave,
  editingCelebration,
  temposLiturgicos,
  musicos,
  showNotification
}: CelebrationModalProps) {
  
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('19:00');
  const [local, setLocal] = useState('Igreja Matriz');
  const [season, setSeason] = useState('Tempo Comum');
  const [tipoCelebracao, setTipoCelebracao] = useState('Santa Missa Dominical');
  const [observacoes, setObservacoes] = useState('');

  // Escala
  const [escala, setEscala] = useState<{ musicoId?: string | number; nome: string; funcao: string; status: 'confirmado' }[]>([]);

  // Selected musician to add to scale in modal
  const [newScaleMusicianId, setNewScaleMusicianId] = useState('');
  const [newScaleFunction, setNewScaleFunction] = useState('Violão');

  useEffect(() => {
    if (editingCelebration) {
      setTitulo(editingCelebration.titulo || '');
      setLocal(editingCelebration.local || 'Igreja Matriz');
      setSeason(editingCelebration.season || 'Tempo Comum');
      setTipoCelebracao(editingCelebration.tipoCelebracao || 'Santa Missa Dominical');
      setObservacoes(editingCelebration.observacoes || '');
      setEscala(editingCelebration.escala || []);

      if (editingCelebration.data) {
        try {
          const d = new Date(editingCelebration.data);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setData(`${yyyy}-${mm}-${dd}`);

            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            setHorario(`${hh}:${min}`);
          }
        } catch {
          setData(editingCelebration.data);
        }
      }
    } else {
      setTitulo('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setData(`${yyyy}-${mm}-${dd}`);
      setHorario('19:00');
      setLocal('Igreja Matriz');
      setSeason('Tempo Comum');
      setTipoCelebracao('Santa Missa Dominical');
      setObservacoes('');
      setEscala([]);
    }
  }, [editingCelebration, isOpen]);

  if (!isOpen) return null;

  const handleAddMusicianToScale = () => {
    if (!newScaleMusicianId) return;
    const musico = musicos.find(m => String(m.id) === String(newScaleMusicianId));
    if (!musico) return;

    setEscala(prev => [
      ...prev,
      {
        musicoId: musico.id,
        nome: musico.nome,
        funcao: newScaleFunction,
        status: 'confirmado'
      }
    ]);
  };

  const handleRemoveFromScale = (index: number) => {
    setEscala(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!titulo.trim()) {
      showNotification('Por favor, dê um título para a celebração.', 'error');
      return;
    }
    if (!data) {
      showNotification('Informe a data da celebração.', 'error');
      return;
    }

    const isoDateTime = `${data}T${horario || '00:00'}:00`;

    onSave({
      id: editingCelebration ? editingCelebration.id : undefined,
      titulo: titulo.trim(),
      data: isoDateTime,
      local: local.trim(),
      season,
      tipoCelebracao,
      observacoes: observacoes.trim(),
      escala,
      repertorio: editingCelebration?.repertorio || [],
      cantosIds: editingCelebration?.cantosIds || [],
      updatedAt: new Date().toISOString()
    });

    onClose();
    showNotification(`Celebração "${titulo}" salva com sucesso!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="font-black text-lg text-slate-900 dark:text-white">
              {editingCelebration ? 'Editar Celebração' : 'Agendar Nova Celebração'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Título */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Título da Celebração: *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: 23º Domingo do Tempo Comum - Missa da Família"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Data: *
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Horário:
              </label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Local e Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Local / Comunidade:
              </label>
              <input
                type="text"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex: Matriz, Comunidade São José"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
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
          </div>

          {/* ESCALA DE MÚSICOS */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Escala do Ministério de Música:</span>
              <span className="text-[11px] font-normal text-slate-400">({escala.length} escalados)</span>
            </label>

            {/* Existing musicians in scale */}
            {escala.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                {escala.map((esc, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <strong className="text-blue-600">{esc.funcao}:</strong> {esc.nome}
                    <button
                      type="button"
                      onClick={() => handleRemoveFromScale(idx)}
                      className="text-slate-400 hover:text-rose-500 ml-1 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add musician row */}
            {musicos.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={newScaleMusicianId}
                  onChange={(e) => setNewScaleMusicianId(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="">Selecione um músico...</option>
                  {musicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>

                <select
                  value={newScaleFunction}
                  onChange={(e) => setNewScaleFunction(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {INSTRUMENT_OPTIONS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddMusicianToScale}
                  disabled={!newScaleMusicianId}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 hover:bg-blue-700"
                >
                  + Escalar
                </button>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Observações / Avisos da Liturgia:
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Terá entrada solene da imagem de Nossa Senhora; Glória cantado sem repetição."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            id="btn-save-celebration"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            Salvar Celebração
          </button>
        </div>

      </div>
    </div>
  );
}

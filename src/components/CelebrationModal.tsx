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
  Trash2,
  Mic2,
  Sparkles,
  BookOpen
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

  // Ensaio State
  const [hasEnsaio, setHasEnsaio] = useState(false);
  const [dataEnsaio, setDataEnsaio] = useState('');
  const [horarioEnsaio, setHorarioEnsaio] = useState('19:30');
  const [localEnsaio, setLocalEnsaio] = useState('Salão Paroquial');
  const [obsEnsaio, setObsEnsaio] = useState('');

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

      if (editingCelebration.ensaio && editingCelebration.ensaio.data) {
        setHasEnsaio(true);
        setDataEnsaio(editingCelebration.ensaio.data || '');
        setHorarioEnsaio(editingCelebration.ensaio.horario || '19:30');
        setLocalEnsaio(editingCelebration.ensaio.local || 'Salão Paroquial');
        setObsEnsaio(editingCelebration.ensaio.observacoes || '');
      } else {
        setHasEnsaio(false);
        setDataEnsaio('');
        setHorarioEnsaio('19:30');
        setLocalEnsaio('Salão Paroquial');
        setObsEnsaio('');
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

      // Default Ensaio suggested 2 days before
      const ensaioDate = new Date();
      ensaioDate.setDate(tomorrow.getDate() - 2);
      const eYyyy = ensaioDate.getFullYear();
      const eMm = String(ensaioDate.getMonth() + 1).padStart(2, '0');
      const eDd = String(ensaioDate.getDate()).padStart(2, '0');
      setDataEnsaio(`${eYyyy}-${eMm}-${eDd}`);
      setHorarioEnsaio('19:30');
      setLocalEnsaio('Salão Paroquial');
      setObsEnsaio('');
      setHasEnsaio(false);
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
    setNewScaleMusicianId('');
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

    const ensaioObj = hasEnsaio && dataEnsaio ? {
      data: dataEnsaio,
      horario: horarioEnsaio || '19:30',
      local: localEnsaio || 'Salão Paroquial',
      observacoes: obsEnsaio.trim(),
      musicasIds: editingCelebration?.repertorio?.map(r => r.cantoId) || []
    } : undefined;

    onSave({
      id: editingCelebration ? editingCelebration.id : undefined,
      titulo: titulo.trim(),
      data: isoDateTime,
      local: local.trim(),
      season,
      tipoCelebracao,
      observacoes: observacoes.trim(),
      escala,
      ensaio: ensaioObj,
      repertorio: editingCelebration?.repertorio || [],
      cantosIds: editingCelebration?.cantosIds || [],
      updatedAt: new Date().toISOString()
    });

    onClose();
    showNotification(`Celebração "${titulo}" preparada com sucesso!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="modal-preparar-celebracao"
        className="bg-white dark:bg-[#0e1726] rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 my-auto"
      >
        
        {/* Header with 3D Depth */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 border border-blue-400/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                {editingCelebration ? 'Editar Celebração' : '+ Preparar Celebração'}
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Liturgia & Escala
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize a data, o tempo litúrgico, a escala musical e o ensaio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          
          {/* Título & Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Título da Celebração *
              </label>
              <input
                id="input-celebration-title"
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Missa do 20º Domingo do Tempo Comum"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tipo
              </label>
              <select
                value={tipoCelebracao}
                onChange={(e) => setTipoCelebracao(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              >
                <option value="Santa Missa Dominical">Missa Dominical</option>
                <option value="Santa Missa Solene">Missa Solene</option>
                <option value="Celebração da Palavra">Celebração da Palavra</option>
                <option value="Adoração ao Santíssimo">Adoração ao Santíssimo</option>
                <option value="Casamento">Casamento</option>
                <option value="Batismo">Batismo</option>
                <option value="Crisma">Crisma</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Data, Horário e Local */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Data da Missa *
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Horário
              </label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                Local / Igreja
              </label>
              <input
                type="text"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex: Igreja Matriz São José"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              />
            </div>
          </div>

          {/* Tempo Litúrgico */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Tempo Litúrgico
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {temposLiturgicos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSeason(t.id)}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                    season === t.id
                      ? `${t.color} text-white shadow-md shadow-blue-500/20 border-white/30 scale-[1.02]`
                      : 'bg-slate-50 dark:bg-[#152238] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{t.label}</span>
                  {season === t.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* SEÇÃO ESPECIAL: ENSAIO VINCULADO */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Mic2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    🎤 Ensaio do Ministério
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Defina data e horário do ensaio preparatório para esta celebração.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEnsaio}
                  onChange={(e) => setHasEnsaio(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {hasEnsaio && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-purple-200/60 dark:border-purple-900/60 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Data do Ensaio
                  </label>
                  <input
                    type="date"
                    value={dataEnsaio}
                    onChange={(e) => setDataEnsaio(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#152238] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Horário do Ensaio
                  </label>
                  <input
                    type="time"
                    value={horarioEnsaio}
                    onChange={(e) => setHorarioEnsaio(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#152238] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Local do Ensaio
                  </label>
                  <input
                    type="text"
                    value={localEnsaio}
                    onChange={(e) => setLocalEnsaio(e.target.value)}
                    placeholder="Ex: Salão Paroquial"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#152238] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ESCALA DE MÚSICOS */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Escala de Músicos para a Celebração ({escala.length})
              </span>
            </label>

            {/* Add musician row */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <select
                value={newScaleMusicianId}
                onChange={(e) => setNewScaleMusicianId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              >
                <option value="">Selecione um músico do acervo...</option>
                {musicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} {m.instrumentos?.length ? `(${m.instrumentos.join(', ')})` : ''}
                  </option>
                ))}
              </select>

              <select
                value={newScaleFunction}
                onChange={(e) => setNewScaleFunction(e.target.value)}
                className="w-32 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              >
                {INSTRUMENT_OPTIONS.map((inst) => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddMusicianToScale}
                disabled={!newScaleMusicianId}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Escalar
              </button>
            </div>

            {/* Musician list */}
            {escala.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                {escala.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152238] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
                  >
                    <span><strong>{item.funcao}:</strong> {item.nome}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromScale(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remover da escala"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Nenhum músico escalado ainda. Adicione os instrumentistas e cantores acima.
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Observações Litúrgicas
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Avisos para a equipe, leituras especiais, orientações do padre ou momentos diferenciados..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {editingCelebration ? 'Salvar Alterações' : 'Salvar Celebração e Ensaio'}
          </button>
        </div>

      </div>
    </div>
  );
}

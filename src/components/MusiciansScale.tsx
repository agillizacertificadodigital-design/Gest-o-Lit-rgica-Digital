/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Mail, 
  Phone, 
  Music, 
  Calendar, 
  Award,
  Sparkles,
  Search
} from 'lucide-react';
import { Musico, AgendaItem } from '../types';
import { INSTRUMENT_OPTIONS } from '../constants';

interface MusiciansScaleProps {
  musicos: Musico[];
  agenda: AgendaItem[];
  onSaveMusico: (musico: Partial<Musico>) => void;
  onDeleteMusico: (musico: Musico) => void;
  onUpdateAgenda: (agenda: AgendaItem) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function MusiciansScale({
  musicos,
  agenda,
  onSaveMusico,
  onDeleteMusico,
  onUpdateAgenda,
  showNotification
}: MusiciansScaleProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMusico, setEditingMusico] = useState<Musico | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [instrumentos, setInstrumentos] = useState<string[]>([]);
  const [funcaoPrincipal, setFuncaoPrincipal] = useState('Violão');
  const [ativo, setAtivo] = useState(true);

  // Quick scale assign modal
  const [assigningCelebration, setAssigningCelebration] = useState<AgendaItem | null>(null);
  const [selectedMusicoId, setSelectedMusicoId] = useState<string>('');
  const [selectedFunction, setSelectedFunction] = useState<string>('Voz Principal');

  const filteredMusicos = musicos.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.funcaoPrincipal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.instrumentos.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenNew = () => {
    setEditingMusico(null);
    setNome('');
    setEmail('');
    setTelefone('');
    setInstrumentos(['Violão']);
    setFuncaoPrincipal('Violão');
    setAtivo(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Musico) => {
    setEditingMusico(m);
    setNome(m.nome);
    setEmail(m.email || '');
    setTelefone(m.telefone || '');
    setInstrumentos(m.instrumentos || []);
    setFuncaoPrincipal(m.funcaoPrincipal || 'Violão');
    setAtivo(m.ativo !== false);
    setIsModalOpen(true);
  };

  const handleToggleInstrument = (inst: string) => {
    setInstrumentos(prev => 
      prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
    );
  };

  const handleSave = () => {
    if (!nome.trim()) {
      showNotification('Nome do músico é obrigatório.', 'error');
      return;
    }

    onSaveMusico({
      id: editingMusico ? editingMusico.id : undefined,
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      instrumentos: instrumentos.length > 0 ? instrumentos : [funcaoPrincipal],
      funcaoPrincipal,
      ativo,
      updatedAt: new Date().toISOString()
    });

    setIsModalOpen(false);
    showNotification(`Músico ${nome} salvo com sucesso!`, 'success');
  };

  // Add Musician to Celebration Scale
  const handleConfirmAssign = () => {
    if (!assigningCelebration || !selectedMusicoId) return;
    const musico = musicos.find(m => String(m.id) === String(selectedMusicoId));
    if (!musico) return;

    const currentEscala = assigningCelebration.escala || [];
    const updatedEscala = [
      ...currentEscala,
      {
        musicoId: musico.id,
        nome: musico.nome,
        funcao: selectedFunction,
        status: 'confirmado' as const
      }
    ];

    const updated: AgendaItem = {
      ...assigningCelebration,
      escala: updatedEscala,
      updatedAt: new Date().toISOString()
    };

    onUpdateAgenda(updated);
    setAssigningCelebration(null);
    showNotification(`${musico.nome} escalado para ${assigningCelebration.titulo}!`, 'success');
  };

  // Remove musician from celebration scale
  const handleRemoveFromScale = (agendaItem: AgendaItem, index: number) => {
    const updatedEscala = (agendaItem.escala || []).filter((_, i) => i !== index);
    const updated: AgendaItem = {
      ...agendaItem,
      escala: updatedEscala,
      updatedAt: new Date().toISOString()
    };
    onUpdateAgenda(updated);
    showNotification('Membro removido da escala.', 'info');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-500" />
            Músicos & Escalas Litúrgicas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cadastre os membros do ministério, instrumentos dominados e organize as escalas das Missas.
          </p>
        </div>

        <button
          id="btn-novo-musico"
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Músico
        </button>
      </div>

      {/* Grid: 2 Columns (Escalas das Próximas Celebrações & Lista de Músicos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col (2/3): Escalas das Celebrações */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Escalas das Próximas Celebrações
          </h3>

          {agenda.length > 0 ? (
            <div className="space-y-4">
              {agenda.slice(0, 4).map(item => (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {item.titulo}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {new Date(item.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} • {item.local || 'Paróquia'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setAssigningCelebration(item);
                        if (musicos.length > 0) setSelectedMusicoId(String(musicos[0].id));
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Escalar Músico
                    </button>
                  </div>

                  {/* Escala chips */}
                  {item.escala && item.escala.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.escala.map((esc, i) => (
                        <div 
                          key={i}
                          className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl text-xs border border-slate-200 dark:border-slate-700"
                        >
                          <span className="font-bold text-blue-600 dark:text-blue-400">{esc.funcao}:</span>
                          <span className="font-medium text-slate-900 dark:text-white">{esc.nome}</span>
                          <button
                            onClick={() => handleRemoveFromScale(item, i)}
                            className="text-slate-400 hover:text-rose-500 ml-1"
                            title="Remover da escala"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1">
                      Nenhum músico escalado ainda para esta celebração.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-white dark:bg-slate-900 p-6 rounded-3xl text-center">
              Nenhuma celebração agendada.
            </p>
          )}
        </div>

        {/* Right Col (1/3): Membros do Ministério */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Membros ({musicos.length})
            </h3>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou instrumento..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredMusicos.map(m => (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {m.nome}
                    </h4>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {m.funcaoPrincipal}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1 text-slate-400 hover:text-blue-600"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMusico(m)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Instruments badges */}
                <div className="flex flex-wrap gap-1">
                  {m.instrumentos.map((inst, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                      {inst}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {filteredMusicos.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                Nenhum músico encontrado.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* CREATE / EDIT MUSICIAN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {editingMusico ? 'Editar Músico' : 'Cadastrar Novo Músico'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nome Completo: *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Função Principal:
                  </label>
                  <select
                    value={funcaoPrincipal}
                    onChange={(e) => setFuncaoPrincipal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {INSTRUMENT_OPTIONS.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telefone / WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Multi-instrument checklist */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Instrumentos que domina:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {INSTRUMENT_OPTIONS.map(inst => (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => handleToggleInstrument(inst)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        instrumentos.includes(inst)
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {inst}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Salvar Músico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MUSICIAN TO CELEBRATION MODAL */}
      {assigningCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Escalar para {assigningCelebration.titulo}
              </h3>
              <button 
                onClick={() => setAssigningCelebration(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Músico:
                </label>
                <select
                  value={selectedMusicoId}
                  onChange={(e) => setSelectedMusicoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  {musicos.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({m.funcaoPrincipal})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Função / Instrumento nesta Celebração:
                </label>
                <select
                  value={selectedFunction}
                  onChange={(e) => setSelectedFunction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {INSTRUMENT_OPTIONS.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setAssigningCelebration(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAssign}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Confirmar Escala
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

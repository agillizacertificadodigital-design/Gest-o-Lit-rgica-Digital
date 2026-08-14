/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Church, 
  Calendar, 
  Music, 
  BookOpen, 
  Users, 
  Star, 
  Clock, 
  MapPin, 
  Play, 
  Plus, 
  Sparkles, 
  ChevronRight, 
  Eye, 
  Layers, 
  ArrowRight,
  TrendingUp,
  Headphones,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AgendaItem, Canto, SeasonInfo } from '../types';
import { User } from 'firebase/auth';

interface DashboardProps {
  user: User | null;
  cantos: Canto[];
  agenda: AgendaItem[];
  temposLiturgicos: SeasonInfo[];
  setActiveTab: (tab: string) => void;
  onOpenStageMode: (canto: Canto, agenda?: AgendaItem, index?: number) => void;
  onOpenCelebration: (item: AgendaItem) => void;
  onOpenImport: () => void;
  onToggleFavorite: (cantoId: string | number) => void;
  onOpenNewCelebration: () => void;
}

export function Dashboard({
  user,
  cantos,
  agenda,
  temposLiturgicos,
  setActiveTab,
  onOpenStageMode,
  onOpenCelebration,
  onOpenImport,
  onToggleFavorite,
  onOpenNewCelebration
}: DashboardProps) {
  
  // Find next upcoming celebration
  const now = new Date();
  const sortedUpcoming = [...agenda]
    .filter(a => {
      const itemDate = new Date(a.data);
      return itemDate.getTime() >= now.getTime() - (4 * 60 * 60 * 1000); // 4 hour grace window
    })
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const nextCelebration = sortedUpcoming[0] || null;

  // Recent songs (most recently updated or added)
  const recentSongs = [...cantos]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  // Favorite songs
  const favoriteSongs = cantos.filter(c => c.isFavorite).slice(0, 5);

  // Helper for date formatting
  const formatCelebrationDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getSeasonInfo = (id?: string) => {
    return temposLiturgicos.find(t => t.id === id) || temposLiturgicos[0];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* Top Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/20">
              Painel Litúrgico
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Olá, {user?.displayName || 'Músico Litúrgico'}
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Tudo pronto para a animação dos cantos e celebrações da sua comunidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            id="dash-btn-import"
            onClick={onOpenImport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Importar Cifra
          </button>
          
          <button
            id="dash-btn-new-celebration"
            onClick={onOpenNewCelebration}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all active:scale-95 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Nova Celebração
          </button>
        </div>
      </div>

      {/* Main Feature: PRÓXIMA CELEBRAÇÃO */}
      {nextCelebration ? (
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-950/50 rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 dark:bg-blue-900/10 rounded-bl-full pointer-events-none -z-0" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Próxima Celebração
                </span>
              </div>

              {nextCelebration.season && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${getSeasonInfo(nextCelebration.season).color}`}>
                  {nextCelebration.season}
                </span>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {nextCelebration.titulo}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{formatCelebrationDate(nextCelebration.data)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{nextCelebration.local || 'Paróquia'}</span>
                  </div>

                  {nextCelebration.repertorio && nextCelebration.repertorio.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                      <Music className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{nextCelebration.repertorio.length} cantos no repertório</span>
                    </div>
                  )}
                </div>

                {/* Musicians on duty preview */}
                {nextCelebration.escala && nextCelebration.escala.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Escala:</span>
                    {nextCelebration.escala.slice(0, 4).map((esc, i) => (
                      <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                        <strong>{esc.funcao}:</strong> {esc.nome}
                      </span>
                    ))}
                    {nextCelebration.escala.length > 4 && (
                      <span className="text-[10px] text-blue-600 font-bold">+{nextCelebration.escala.length - 4} mais</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons for Next Celebration */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="dash-btn-ver-repertorio"
                  onClick={() => onOpenCelebration(nextCelebration)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  Ver Repertório
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhuma celebração futura agendada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cadastre a próxima Missa ou Celebração da Palavra para organizar o repertório e escalar os músicos.
          </p>
          <button
            onClick={onOpenNewCelebration}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Agendar Celebração
          </button>
        </div>
      )}

      {/* QUICK ACCESS CARDS */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4 px-1">
          Acesso Rápido
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1: MÚSICAS */}
          <button
            id="dash-card-musicas"
            onClick={() => setActiveTab('cantos')}
            className="group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all text-left relative overflow-hidden cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Music className="w-6 h-6" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base">
              Músicas
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {cantos.length} cadastradas no acervo
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Acessar biblioteca <ChevronRight className="w-3 h-3" />
            </span>
          </button>

          {/* Card 2: REPERTÓRIOS */}
          <button
            id="dash-card-repertorios"
            onClick={() => setActiveTab('repertorios')}
            className="group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all text-left relative overflow-hidden cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base">
              Repertórios
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {agenda.length} celebrações ativas
            </span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Gerenciar repertórios <ChevronRight className="w-3 h-3" />
            </span>
          </button>

          {/* Card 3: CELEBRAÇÕES */}
          <button
            id="dash-card-celebracoes"
            onClick={() => setActiveTab('agenda')}
            className="group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all text-left relative overflow-hidden cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base">
              Celebrações
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Agenda & eventos paroquiais
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Visualizar agenda <ChevronRight className="w-3 h-3" />
            </span>
          </button>

          {/* Card 4: MÚSICOS & ESCALAS */}
          <button
            id="dash-card-musicos"
            onClick={() => setActiveTab('musicos')}
            className="group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all text-left relative overflow-hidden cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base">
              Músicos
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Escalas & instrumentos
            </span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Escalar membros <ChevronRight className="w-3 h-3" />
            </span>
          </button>

        </div>
      </div>

      {/* TWO COLUMN SECTION: MÚSICAS RECENTES & FAVORITAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Músicas Recentes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Músicas Recentes
              </h3>
            </div>
            <button 
              onClick={() => setActiveTab('cantos')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Ver todas
            </button>
          </div>

          {recentSongs.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentSongs.map((canto) => (
                <div 
                  key={canto.id} 
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {canto.nome}
                    </p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-2">
                      <span>{canto.artista || 'Católico'}</span>
                      <span>•</span>
                      <span className="font-bold text-blue-600">Tom: {canto.tom || 'C'}</span>
                      <span>•</span>
                      <span>{canto.tipo}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onToggleFavorite(canto.id)}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        canto.isFavorite ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={canto.isFavorite ? 'Remover favorito' : 'Favoritar'}
                    >
                      <Star className={`w-4 h-4 ${canto.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => onOpenStageMode(canto)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Cifra
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              Nenhuma música recente encontrada.
            </p>
          )}
        </div>

        {/* Favoritas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Músicas Favoritas
              </h3>
            </div>
            <button 
              onClick={() => setActiveTab('cantos')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Ver todas
            </button>
          </div>

          {favoriteSongs.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {favoriteSongs.map((canto) => (
                <div 
                  key={canto.id} 
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {canto.nome}
                    </p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-2">
                      <span>{canto.artista || 'Católico'}</span>
                      <span>•</span>
                      <span className="font-bold text-blue-600">Tom: {canto.tom || 'C'}</span>
                      <span>•</span>
                      <span>{canto.tipo}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onToggleFavorite(canto.id)}
                      className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>

                    <button
                      onClick={() => onOpenStageMode(canto)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Cifra
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-slate-400">
                Você ainda não favoritou nenhuma música.
              </p>
              <p className="text-[11px] text-slate-500">
                Clique na estrela ⭐ ao lado de qualquer música na Biblioteca para fixá-la aqui.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

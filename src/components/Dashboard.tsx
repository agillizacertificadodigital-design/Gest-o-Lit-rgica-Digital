/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Calendar, 
  Music, 
  BookOpen, 
  Users, 
  Star, 
  Clock, 
  MapPin, 
  Plus, 
  Sparkles, 
  ChevronRight, 
  Eye, 
  Mic2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight
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
  onOpenSearchModal?: () => void;
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
  onOpenNewCelebration,
  onOpenSearchModal
}: DashboardProps) {
  
  // Safe greeting name
  const getSafeUserName = () => {
    if (!user) return 'Ministério de Música';
    const name = user.displayName;
    if (name && name.length > 0 && name.length <= 32 && !name.includes('...') && !name.toLowerCase().includes('não se trata')) {
      return name;
    }
    if (user.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Ministério de Música';
  };

  // Find next upcoming celebration
  const now = new Date();
  const sortedUpcoming = [...agenda]
    .filter(a => {
      const itemDate = new Date(a.data);
      return itemDate.getTime() >= now.getTime() - (4 * 60 * 60 * 1000); // 4 hour grace window
    })
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const nextCelebration = sortedUpcoming[0] || null;

  // Compute pending issues for "PARA VOCÊ RESOLVER"
  const pendingIssues: { id: string; title: string; desc: string; type: 'warning' | 'info'; action: () => void; actionLabel: string }[] = [];

  if (nextCelebration) {
    const repCount = nextCelebration.repertorio?.length || 0;
    const escalaCount = nextCelebration.escala?.length || 0;

    if (repCount === 0) {
      pendingIssues.push({
        id: 'no-repertorio',
        title: 'Celebração sem repertório definido',
        desc: `A celebração "${nextCelebration.titulo}" ainda não possui músicas vinculadas.`,
        type: 'warning',
        action: () => onOpenCelebration(nextCelebration),
        actionLabel: 'Montar Repertório'
      });
    }

    if (escalaCount === 0) {
      pendingIssues.push({
        id: 'no-escala',
        title: 'Escala de músicos pendente',
        desc: `Nenhum instrumentista ou cantor foi escalado para "${nextCelebration.titulo}".`,
        type: 'warning',
        action: () => onOpenCelebration(nextCelebration),
        actionLabel: 'Escalar Músicos'
      });
    }

    if (!nextCelebration.ensaio || !nextCelebration.ensaio.data) {
      pendingIssues.push({
        id: 'no-ensaio',
        title: 'Ensaio preparatório não agendado',
        desc: `Defina data e horário do ensaio para alinhar os cantos com a equipe.`,
        type: 'info',
        action: () => onOpenCelebration(nextCelebration),
        actionLabel: 'Definir Ensaio'
      });
    }
  }

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
      
      {/* 1. TOP GREETING HEADER WITH 3D AMBIENT LIGHTING */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0c1830] via-[#0f2244] to-[#091224] text-white border border-blue-500/20 shadow-2xl">
        {/* Glow ambient spots */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-black uppercase tracking-wider border border-blue-400/30">
                Painel Litúrgico Digital
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Olá, {getSafeUserName()}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
              Tudo pronto para a preparação dos cantos e animação das celebrações.
            </p>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Action Button: 🔎 BUSCAR MÚSICA OU CIFRA (Amber 3D Tactile) */}
            {onOpenSearchModal && (
              <button
                id="dash-btn-search-external"
                onClick={onOpenSearchModal}
                className="btn-3d-gold flex items-center gap-2 px-4.5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wide cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>🔎 BUSCAR MÚSICA OU CIFRA</span>
              </button>
            )}

            {/* + PREPARAR CELEBRAÇÃO (Blue 3D Tactile) */}
            <button
              id="dash-btn-new-celebration"
              onClick={onOpenNewCelebration}
              className="btn-3d-primary flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 border border-blue-400/30"
            >
              <Calendar className="w-4 h-4" />
              <span>+ PREPARAR CELEBRAÇÃO</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PRÓXIMA CELEBRAÇÃO (3D Elevated Card or Compact Empty State) */}
      {nextCelebration ? (
        <div className="card-3d-premium bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 dark:bg-blue-600/10 rounded-bl-full pointer-events-none" />
          
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
                <span className={`text-xs font-bold px-3 py-1 rounded-full text-white shadow-xs ${getSeasonInfo(nextCelebration.season).color}`}>
                  {nextCelebration.season}
                </span>
              )}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {nextCelebration.titulo}
                </h2>
                
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#152238] px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{formatCelebrationDate(nextCelebration.data)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#152238] px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{nextCelebration.local || 'Paróquia'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#152238] px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    <Music className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{nextCelebration.repertorio?.length || 0} cantos no repertório</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#152238] px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>{nextCelebration.escala?.length || 0} músicos escalados</span>
                  </div>
                </div>

                {/* Ensaio vinculativo */}
                {nextCelebration.ensaio && nextCelebration.ensaio.data ? (
                  <div className="flex items-center gap-2 pt-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/60 w-fit">
                    <Mic2 className="w-3.5 h-3.5 text-purple-500" />
                    <span>
                      <strong>Ensaio:</strong> {nextCelebration.ensaio.data} às {nextCelebration.ensaio.horario} ({nextCelebration.ensaio.local || 'Salão Paroquial'})
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Action Button: ABRIR CELEBRAÇÃO */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="dash-btn-ver-repertorio"
                  onClick={() => onOpenCelebration(nextCelebration)}
                  className="btn-3d-primary flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wide cursor-pointer transition-all active:scale-95 border border-blue-400/30"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>ABRIR CELEBRAÇÃO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Compact Empty State for Upcoming Celebration */
        <div className="card-3d-premium bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#152238] flex items-center justify-center text-slate-500 shrink-0 border border-slate-200 dark:border-slate-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                Nenhuma celebração programada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prepare sua próxima celebração e organize repertório, escala e ensaio.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNewCelebration}
            className="btn-3d-primary px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            + Preparar Celebração
          </button>
        </div>
      )}

      {/* 3. SEÇÃO: "PARA VOCÊ RESOLVER" */}
      {pendingIssues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Para Você Resolver ({pendingIssues.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pendingIssues.map(issue => (
              <div 
                key={issue.id}
                className="card-3d-premium p-4 rounded-2xl bg-white dark:bg-[#0e1726] border border-amber-200/80 dark:border-amber-900/40 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Ação Necessária
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {issue.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {issue.desc}
                  </p>
                </div>

                <button
                  onClick={issue.action}
                  className="w-full px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{issue.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CARDS DE ACESSO RÁPIDO & ESTATÍSTICAS COM PROFUNDIDADE 3D */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 px-1">
          Acesso Rápido & Acervo
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1: MÚSICAS */}
          <button
            id="dash-card-musicas"
            onClick={() => setActiveTab('cantos')}
            className="card-3d-premium group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 text-left cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs border border-blue-200/50 dark:border-blue-800/50">
              <Music className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base">
              Músicas
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {cantos.length} cadastradas no acervo
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Biblioteca musical <ChevronRight className="w-3 h-3" />
            </span>
          </button>

          {/* Card 2: REPERTÓRIOS */}
          <button
            id="dash-card-repertorios"
            onClick={() => setActiveTab('repertorios')}
            className="card-3d-premium group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 text-left cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs border border-indigo-200/50 dark:border-indigo-800/50">
              <BookOpen className="w-5 h-5" />
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
            className="card-3d-premium group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 text-left cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs border border-emerald-200/50 dark:border-emerald-800/50">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base">
              Celebrações
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Agenda & eventos paroquiais
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Agenda litúrgica <ChevronRight className="w-3 h-3" />
            </span>
          </button>

          {/* Card 4: MÚSICOS & ESCALAS */}
          <button
            id="dash-card-musicos"
            onClick={() => setActiveTab('musicos')}
            className="card-3d-premium group flex flex-col items-start p-5 rounded-3xl bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 text-left cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs border border-amber-200/50 dark:border-amber-800/50">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base">
              Músicos
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Escalas & ministérios
            </span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Escalar equipe <ChevronRight className="w-3 h-3" />
            </span>
          </button>

        </div>
      </div>

      {/* 5. TWO COLUMN SECTION: MÚSICAS RECENTES & FAVORITAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Músicas Recentes */}
        <div className="card-3d-premium bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-black text-slate-900 dark:text-white text-base">
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
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-[#152238]/50 px-2.5 rounded-2xl transition-colors"
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
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        canto.isFavorite ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={canto.isFavorite ? 'Remover favorito' : 'Favoritar'}
                    >
                      <Star className={`w-4 h-4 ${canto.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => onOpenStageMode(canto)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all active:scale-95 cursor-pointer"
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
        <div className="card-3d-premium bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <h3 className="font-black text-slate-900 dark:text-white text-base">
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
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-[#152238]/50 px-2.5 rounded-2xl transition-colors"
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
                      className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>

                    <button
                      onClick={() => onOpenStageMode(canto)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all active:scale-95 cursor-pointer"
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

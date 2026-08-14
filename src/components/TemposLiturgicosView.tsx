/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Edit, 
  Trash2, 
  Sun, 
  Moon, 
  Calendar, 
  BookOpen, 
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { SeasonInfo, LiturgicalSeason } from '../types';

interface TemposLiturgicosViewProps {
  temposLiturgicos: SeasonInfo[];
  selectedSeason: LiturgicalSeason | null;
  setSelectedSeason: (season: LiturgicalSeason | null) => void;
  onEditTempo: (tempo: SeasonInfo) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function TemposLiturgicosView({
  temposLiturgicos,
  selectedSeason,
  setSelectedSeason,
  onEditTempo,
  showNotification
}: TemposLiturgicosViewProps) {
  
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Tempos Litúrgicos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Significados, cores litúrgicas e orientações musicais para cada tempo da Igreja.
          </p>
        </div>
      </div>

      {/* Grid of Liturgical Seasons Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {temposLiturgicos.map((tempo) => {
          const isSelected = selectedSeason === tempo.id;
          return (
            <div
              key={tempo.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-500/20' 
                  : 'border-slate-200/90 dark:border-slate-800'
              }`}
            >
              {/* Color Header Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${tempo.color}`}>
                    Cor: {tempo.colorName || 'Litúrgica'}
                  </span>

                  <button
                    onClick={() => onEditTempo(tempo)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Editar informações do tempo"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {tempo.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {tempo.descricao || 'Orientações e características litúrgicas deste tempo sagrado.'}
                  </p>
                </div>
              </div>

              {/* Musical Characteristics / Guidelines */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    Espírito Musical:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 italic">
                    {tempo.musicalGuidelines || 'Cantos sóbrios, de exaltação ou meditação conforme o mistério celebrado.'}
                  </p>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

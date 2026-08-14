/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Music, BookOpen, X, ArrowRight, Eye } from 'lucide-react';
import { Canto, AgendaItem } from '../types';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cantos: Canto[];
  agenda: AgendaItem[];
  onOpenStageMode: (canto: Canto) => void;
  onOpenCelebration: (item: AgendaItem) => void;
}

export function QuickSearchModal({
  isOpen,
  onClose,
  cantos,
  agenda,
  onOpenStageMode,
  onOpenCelebration
}: QuickSearchModalProps) {
  
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const term = query.toLowerCase().trim();

  const matchedCantos = term
    ? cantos.filter(c => 
        c.nome.toLowerCase().includes(term) ||
        (c.artista && c.artista.toLowerCase().includes(term)) ||
        (c.tipo && c.tipo.toLowerCase().includes(term)) ||
        (c.letra && c.letra.toLowerCase().includes(term))
      ).slice(0, 8)
    : cantos.slice(0, 5);

  const matchedCelebrations = term
    ? agenda.filter(a =>
        a.titulo.toLowerCase().includes(term) ||
        (a.local && a.local.toLowerCase().includes(term))
      ).slice(0, 4)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar música, cifra, momento ou celebração..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onClose}
            className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          
          {/* Songs results */}
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
              Músicas & Cifras
            </p>
            {matchedCantos.length > 0 ? (
              <div className="space-y-1">
                {matchedCantos.map(canto => (
                  <div
                    key={canto.id}
                    onClick={() => {
                      onOpenStageMode(canto);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {canto.nome}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {canto.artista || 'Católico'} • Tom: {canto.tom || 'C'} • {canto.tipo}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
                        Ver cifra <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                Nenhuma música encontrada.
              </p>
            )}
          </div>

          {/* Celebrations results if matched */}
          {matchedCelebrations.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Celebrações
              </p>
              <div className="space-y-1">
                {matchedCelebrations.map(cel => (
                  <div
                    key={cel.id}
                    onClick={() => {
                      onOpenCelebration(cel);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cel.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {new Date(cel.data).toLocaleDateString('pt-BR')} • {cel.local || 'Paróquia'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

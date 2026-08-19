/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Church, 
  BookOpen, 
  Music, 
  Calendar, 
  MoreHorizontal, 
  Users, 
  Layers, 
  PlusCircle, 
  Settings, 
  Sparkles,
  X
} from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenImport: () => void;
}

export function MobileNav({ activeTab, setActiveTab, onOpenImport }: MobileNavProps) {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Início', icon: Church },
    { id: 'repertorios', label: 'Repertório', icon: BookOpen },
    { id: 'cantos', label: 'Músicas', icon: Music },
    { id: 'agenda', label: 'Celebrações', icon: Calendar },
  ];

  return (
    <>
      {/* Drawer for 'Mais' */}
      {showMoreDrawer && (
        <div 
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowMoreDrawer(false)}
        >
          <div 
            className="bg-white dark:bg-[#0e1726] rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-black text-slate-900 dark:text-white text-base">
                Mais Opções
              </span>
              <button 
                onClick={() => setShowMoreDrawer(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setActiveTab('musicos');
                  setShowMoreDrawer(false);
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#152238] border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-center cursor-pointer shadow-xs active:scale-95 transition-transform"
              >
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold">Músicos & Escalas</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('tempos');
                  setShowMoreDrawer(false);
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#152238] border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-center cursor-pointer shadow-xs active:scale-95 transition-transform"
              >
                <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold">Tempos Litúrgicos</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreDrawer(false);
                  onOpenImport();
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-center cursor-pointer shadow-xs active:scale-95 transition-transform"
              >
                <PlusCircle className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-bold">Importar Cifra</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('config');
                  setShowMoreDrawer(false);
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#152238] border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-center cursor-pointer shadow-xs active:scale-95 transition-transform"
              >
                <Settings className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold">Configurações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar with 3D Glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/90 dark:bg-[#070d19]/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/90 shadow-2xl px-2 py-1.5 flex items-center justify-around">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[60px] min-h-[48px] transition-all cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-50 dark:bg-blue-950/70' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* 'Mais' Button */}
        <button
          onClick={() => setShowMoreDrawer(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[60px] min-h-[48px] transition-all cursor-pointer ${
            showMoreDrawer || activeTab === 'musicos' || activeTab === 'tempos' || activeTab === 'config'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="p-1 rounded-lg">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Mais</span>
        </button>
      </div>
    </>
  );
}

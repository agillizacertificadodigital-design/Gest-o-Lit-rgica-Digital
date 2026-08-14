/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Church, 
  Music, 
  BookOpen, 
  Calendar, 
  Users, 
  Sun, 
  Moon, 
  Search, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Sparkles, 
  CloudOff, 
  Layers, 
  Settings,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenQuickSearch: () => void;
  onOpenImport: () => void;
  onOpenNewCelebration: () => void;
  isOffline: boolean;
}

export function Navbar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  isDarkMode,
  setIsDarkMode,
  onOpenQuickSearch,
  onOpenImport,
  onOpenNewCelebration,
  isOffline
}: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: Church },
    { id: 'repertorios', label: 'Repertórios', icon: BookOpen },
    { id: 'cantos', label: 'Músicas', icon: Music },
    { id: 'agenda', label: 'Celebrações', icon: Calendar },
    { id: 'musicos', label: 'Músicos & Escala', icon: Users },
    { id: 'tempos', label: 'Tempos Litúrgicos', icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Gestão Litúrgica
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  Digital
                </span>
              </span>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium hidden sm:block">
                Ministérios de Música & Liturgia
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2">
            
            {/* Quick Search Button */}
            <button
              id="btn-quick-search"
              onClick={onOpenQuickSearch}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200/60 dark:border-slate-700"
              title="Buscar música ou cifra (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Buscar cifra</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Offline indicator */}
            {isOffline ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </span>
            ) : null}

            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={() => setIsDarkMode(prev => !prev)}
              aria-label="Alternar tema"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* User Profile / Menu */}
            {user ? (
              <div className="relative">
                <button
                  id="btn-user-profile"
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() || 'U')}
                  </div>
                </button>

                {showUserMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.displayName || 'Músico Litúrgico'}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <button
                      id="menu-settings"
                      onClick={() => setActiveTab('config')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Configurações do Perfil
                    </button>

                    <button
                      id="menu-import"
                      onClick={onOpenImport}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Importar Cifra / Partitura
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        id="btn-logout"
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </header>
  );
}

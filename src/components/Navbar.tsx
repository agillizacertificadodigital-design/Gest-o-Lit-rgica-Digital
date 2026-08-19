/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles, 
  Layers, 
  Settings,
  WifiOff,
  ChevronDown,
  MoreHorizontal
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Sanitized display name preventing long AI-generated strings or odd fallbacks
  const getSafeDisplayName = () => {
    if (!user) return 'Músico Litúrgico';
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

  const safeName = getSafeDisplayName();

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryNavItems = [
    { id: 'dashboard', label: 'Início', icon: Church },
    { id: 'repertorios', label: 'Repertórios', icon: BookOpen },
    { id: 'cantos', label: 'Músicas', icon: Music },
    { id: 'agenda', label: 'Celebrações', icon: Calendar },
    { id: 'musicos', label: 'Músicos & Escala', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#070d19]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Title with 3D Depth */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group" 
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 border border-blue-400/30 group-hover:scale-105 transition-transform duration-200">
              <Church className="w-5 h-5 drop-shadow-sm" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Gestão Litúrgica
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 shadow-xs">
                  Digital
                </span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold hidden sm:block">
                Música, Liturgia & Repertórios
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/80 dark:border-blue-800/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}

            {/* Dropdown "Mais" */}
            <div className="relative" ref={moreMenuRef}>
              <button
                id="nav-link-more"
                onClick={() => setShowMoreMenu(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'tempos' || activeTab === 'config'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>Mais</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showMoreMenu && (
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-[#0e1726] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setActiveTab('tempos');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Tempos Litúrgicos
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('config');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Configurações & Perfil
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            
            {/* Quick Search Shortcut Button */}
            <button
              id="btn-quick-search"
              onClick={onOpenQuickSearch}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#152238] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-xs cursor-pointer active:scale-95"
              title="Buscar música ou cifra (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Buscar cifra</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Offline indicator */}
            {isOffline && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}

            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={() => setIsDarkMode(prev => !prev)}
              aria-label="Alternar tema"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* User Profile Menu */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  id="btn-user-profile"
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-blue-500/20 border border-blue-400/30">
                    {safeName.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#0e1726] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {safeName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <button
                      id="menu-settings"
                      onClick={() => {
                        setActiveTab('config');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Configurações do Perfil
                    </button>

                    <button
                      id="menu-import"
                      onClick={() => {
                        onOpenImport();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Importar Cifra / Partitura
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        id="btn-logout"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}

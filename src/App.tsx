/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy 
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { Canto, AgendaItem, SeasonInfo, LiturgicalSeason, Musico } from './types';
import { INITIAL_SEASONS, INITIAL_CATEGORIES } from './constants';

// Modular Components
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { MusicLibrary } from './components/MusicLibrary';
import { RepertoireManager } from './components/RepertoireManager';
import { MusiciansScale } from './components/MusiciansScale';
import { TemposLiturgicosView } from './components/TemposLiturgicosView';
import { SettingsView } from './components/SettingsView';
import { StageMode } from './components/StageMode';
import { ImportModal } from './components/ImportModal';
import { SearchAndImportModal } from './components/SearchAndImportModal';
import { CelebrationModal } from './components/CelebrationModal';
import { CantoEditorModal } from './components/CantoEditorModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { Auth } from './components/Auth';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Navigation Active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Offline status tracking
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    document.title = "Gestão Litúrgica Digital";
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Notifications / Toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  // Main Data States with LocalStorage fallback
  const [cantos, setCantos] = useState<Canto[]>(() => {
    try {
      const saved = localStorage.getItem('v5_cantos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [agenda, setAgenda] = useState<AgendaItem[]>(() => {
    try {
      const saved = localStorage.getItem('v5_agenda');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [musicos, setMusicos] = useState<Musico[]>(() => {
    try {
      const saved = localStorage.getItem('v5_musicos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categorias, setCategorias] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('v5_cats');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [temposLiturgicos, setTemposLiturgicos] = useState<SeasonInfo[]>(() => {
    try {
      const saved = localStorage.getItem('v5_tempos');
      return saved ? JSON.parse(saved) : INITIAL_SEASONS;
    } catch {
      return INITIAL_SEASONS;
    }
  });

  // Liturgical season selected
  const [selectedSeason, setSelectedSeason] = useState<LiturgicalSeason | null>(null);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
    } catch {
      // Ignorar erro
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // Ignorar erro
    }
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('v5_cantos', JSON.stringify(cantos));
  }, [cantos]);

  useEffect(() => {
    localStorage.setItem('v5_agenda', JSON.stringify(agenda));
  }, [agenda]);

  useEffect(() => {
    localStorage.setItem('v5_musicos', JSON.stringify(musicos));
  }, [musicos]);

  useEffect(() => {
    localStorage.setItem('v5_cats', JSON.stringify(categorias));
  }, [categorias]);

  useEffect(() => {
    localStorage.setItem('v5_tempos', JSON.stringify(temposLiturgicos));
  }, [temposLiturgicos]);

  // Firestore Real-time Subscriptions
  useEffect(() => {
    if (!user || !db) return;

    // 1. Cantos
    const qCantos = query(collection(db, 'cantos'), where('ownerId', '==', user.uid), orderBy('nome', 'asc'));
    const unsubCantos = onSnapshot(qCantos, (snapshot) => {
      setCantos(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cantos'));

    // 2. Agenda
    const qAgenda = query(collection(db, 'agenda'), where('ownerId', '==', user.uid), orderBy('data', 'asc'));
    const unsubAgenda = onSnapshot(qAgenda, (snapshot) => {
      setAgenda(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'agenda'));

    // 3. Músicos
    const qMusicos = query(collection(db, 'musicos'), where('ownerId', '==', user.uid), orderBy('nome', 'asc'));
    const unsubMusicos = onSnapshot(qMusicos, (snapshot) => {
      setMusicos(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'musicos'));

    // 4. User Preferences
    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categorias) setCategorias(data.categorias);
        if (data.temposLiturgicos && data.temposLiturgicos.length > 0) setTemposLiturgicos(data.temposLiturgicos);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    return () => {
      unsubCantos();
      unsubAgenda();
      unsubMusicos();
      unsubUser();
    };
  }, [user]);

  // Modal & Overlay States
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSearchAndImportModalOpen, setIsSearchAndImportModalOpen] = useState(false);
  const [searchModalInitialQuery, setSearchModalInitialQuery] = useState('');
  const [searchModalInitialTab, setSearchModalInitialTab] = useState<'search' | 'paste' | 'link'>('search');
  const [isCelebrationModalOpen, setIsCelebrationModalOpen] = useState(false);
  const [editingCelebration, setEditingCelebration] = useState<AgendaItem | null>(null);

  const handleOpenSearchModal = (queryText: string = '', tab: 'search' | 'paste' | 'link' = 'search') => {
    setSearchModalInitialQuery(queryText);
    setSearchModalInitialTab(tab);
    setIsSearchAndImportModalOpen(true);
  };

  const [isCantoEditorOpen, setIsCantoEditorOpen] = useState(false);
  const [editingCanto, setEditingCanto] = useState<Canto | null>(null);

  // Stage Mode State
  const [stageModeSong, setStageModeSong] = useState<Canto | null>(null);
  const [stageModeAgenda, setStageModeAgenda] = useState<AgendaItem | null>(null);
  const [stageModeIndex, setStageModeIndex] = useState<number>(0);

  // Keyboard shortcut for quick search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save / Update Canto
  const handleSaveCanto = async (cantoData: Partial<Canto>) => {
    if (!user || !db) {
      // Local mode fallback
      if (cantoData.id) {
        setCantos(prev => prev.map(c => c.id === cantoData.id ? { ...c, ...cantoData } as Canto : c));
      } else {
        const newLocalCanto = {
          ...cantoData,
          id: `local_${Date.now()}`,
          ownerId: 'guest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as Canto;
        setCantos(prev => [...prev, newLocalCanto]);
      }
      return;
    }

    try {
      if (cantoData.id && typeof cantoData.id === 'string' && !cantoData.id.startsWith('local_')) {
        const ref = doc(db, 'cantos', cantoData.id);
        await updateDoc(ref, {
          ...cantoData,
          ownerId: user.uid,
          updatedAt: new Date().toISOString()
        });
      } else {
        const { id, ...dataToInsert } = cantoData;
        await addDoc(collection(db, 'cantos'), {
          ...dataToInsert,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'cantos');
      showNotification('Erro ao salvar música no banco de dados.', 'error');
    }
  };

  // Delete Canto
  const handleDeleteCanto = async (canto: Canto) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${canto.nome}"?`)) return;

    if (!user || !db || String(canto.id).startsWith('local_')) {
      setCantos(prev => prev.filter(c => c.id !== canto.id));
      showNotification('Música excluída com sucesso.', 'info');
      return;
    }

    try {
      await deleteDoc(doc(db, 'cantos', String(canto.id)));
      showNotification('Música excluída do acervo.', 'info');
    } catch (err) {
      showNotification('Erro ao excluir música.', 'error');
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (cantoId: string | number) => {
    const found = cantos.find(c => String(c.id) === String(cantoId));
    if (!found) return;

    const newFav = !found.isFavorite;

    if (!user || !db || String(found.id).startsWith('local_')) {
      setCantos(prev => prev.map(c => String(c.id) === String(cantoId) ? { ...c, isFavorite: newFav } : c));
      return;
    }

    try {
      await updateDoc(doc(db, 'cantos', String(found.id)), {
        isFavorite: newFav,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Local state update fallback
      setCantos(prev => prev.map(c => String(c.id) === String(cantoId) ? { ...c, isFavorite: newFav } : c));
    }
  };

  // Save / Update Agenda
  const handleSaveAgenda = async (agendaData: Partial<AgendaItem>) => {
    if (!user || !db) {
      if (agendaData.id) {
        setAgenda(prev => prev.map(a => a.id === agendaData.id ? { ...a, ...agendaData } as AgendaItem : a));
      } else {
        const newLocalAgenda = {
          ...agendaData,
          id: `local_agenda_${Date.now()}`,
          ownerId: 'guest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as AgendaItem;
        setAgenda(prev => [...prev, newLocalAgenda]);
      }
      return;
    }

    try {
      if (agendaData.id && typeof agendaData.id === 'string' && !agendaData.id.startsWith('local_')) {
        const ref = doc(db, 'agenda', agendaData.id);
        await updateDoc(ref, {
          ...agendaData,
          ownerId: user.uid,
          updatedAt: new Date().toISOString()
        });
      } else {
        const { id, ...dataToInsert } = agendaData;
        await addDoc(collection(db, 'agenda'), {
          ...dataToInsert,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'agenda');
      showNotification('Erro ao salvar celebração.', 'error');
    }
  };

  // Delete Agenda
  const handleDeleteAgenda = async (agendaItem: AgendaItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${agendaItem.titulo}"?`)) return;

    if (!user || !db || String(agendaItem.id).startsWith('local_')) {
      setAgenda(prev => prev.filter(a => a.id !== agendaItem.id));
      showNotification('Celebração excluída.', 'info');
      return;
    }

    try {
      await deleteDoc(doc(db, 'agenda', String(agendaItem.id)));
      showNotification('Celebração excluída com sucesso.', 'info');
    } catch {
      showNotification('Erro ao excluir celebração.', 'error');
    }
  };

  // Save / Update Musico
  const handleSaveMusico = async (musicoData: Partial<Musico>) => {
    if (!user || !db) {
      if (musicoData.id) {
        setMusicos(prev => prev.map(m => m.id === musicoData.id ? { ...m, ...musicoData } as Musico : m));
      } else {
        const newLocalMusico = {
          ...musicoData,
          id: `local_musico_${Date.now()}`,
          ownerId: 'guest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as Musico;
        setMusicos(prev => [...prev, newLocalMusico]);
      }
      return;
    }

    try {
      if (musicoData.id && typeof musicoData.id === 'string' && !musicoData.id.startsWith('local_')) {
        const ref = doc(db, 'musicos', musicoData.id);
        await updateDoc(ref, {
          ...musicoData,
          ownerId: user.uid,
          updatedAt: new Date().toISOString()
        });
      } else {
        const { id, ...dataToInsert } = musicoData;
        await addDoc(collection(db, 'musicos'), {
          ...dataToInsert,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'musicos');
      showNotification('Erro ao salvar músico.', 'error');
    }
  };

  // Delete Musico
  const handleDeleteMusico = async (musico: Musico) => {
    if (!window.confirm(`Excluir músico "${musico.nome}"?`)) return;

    if (!user || !db || String(musico.id).startsWith('local_')) {
      setMusicos(prev => prev.filter(m => m.id !== musico.id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'musicos', String(musico.id)));
      showNotification('Músico excluído.', 'info');
    } catch {
      showNotification('Erro ao excluir músico.', 'error');
    }
  };

  // Quick Add Song to Repertoire with specific key
  const handleAddToRepertoire = (canto: Canto, agendaId: string | number, tomUtilizado: string, momento?: string) => {
    const targetAgenda = agenda.find(a => String(a.id) === String(agendaId));
    if (!targetAgenda) return;

    const currentRepertorio = targetAgenda.repertorio || [];
    const newItem = {
      cantoId: canto.id,
      momento: momento || canto.tipo || 'Momento',
      tom: tomUtilizado || canto.tom || 'C',
      ordem: currentRepertorio.length + 1
    };

    const updated: AgendaItem = {
      ...targetAgenda,
      repertorio: [...currentRepertorio, newItem],
      cantosIds: [...(targetAgenda.cantosIds || []), canto.id],
      updatedAt: new Date().toISOString()
    };

    handleSaveAgenda(updated);
    showNotification(`"${canto.nome}" adicionada em ${tomUtilizado} à celebração "${targetAgenda.titulo}"!`, 'success');
  };

  // Open Stage Mode Handler
  const handleOpenStageMode = (canto: Canto, agendaItem?: AgendaItem, index?: number) => {
    setStageModeSong(canto);
    setStageModeAgenda(agendaItem || null);
    setStageModeIndex(index || 0);
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      showNotification('Você saiu da sua conta.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm font-bold text-slate-300">
          Carregando Gestão Litúrgica Digital...
        </p>
      </div>
    );
  }

  // If user is not authenticated, show Authentication Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Auth onAuthSuccess={() => showNotification('Bem-vindo(a) ao Gestão Litúrgica!', 'success')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20'
              : notification.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-950/20'
              : 'bg-blue-600 text-white border-blue-500 shadow-blue-950/20'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 ml-2">✕</button>
          </div>
        </div>
      )}

      {/* Main Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenNewCelebration={() => {
          setEditingCelebration(null);
          setIsCelebrationModalOpen(true);
        }}
        isOffline={isOffline}
      />

      {/* Main App Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-12">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            cantos={cantos}
            agenda={agenda}
            temposLiturgicos={temposLiturgicos}
            setActiveTab={setActiveTab}
            onOpenStageMode={(canto) => handleOpenStageMode(canto)}
            onOpenCelebration={(item) => {
              setActiveTab('repertorios');
            }}
            onOpenImport={() => setIsImportModalOpen(true)}
            onToggleFavorite={handleToggleFavorite}
            onOpenSearchModal={() => handleOpenSearchModal()}
            onOpenNewCelebration={() => {
              setEditingCelebration(null);
              setIsCelebrationModalOpen(true);
            }}
          />
        )}

        {/* REPERTÓRIOS TAB */}
        {activeTab === 'repertorios' && (
          <RepertoireManager
            agenda={agenda}
            cantos={cantos}
            temposLiturgicos={temposLiturgicos}
            categorias={categorias}
            onOpenStageMode={handleOpenStageMode}
            onUpdateAgenda={handleSaveAgenda}
            onDeleteAgenda={handleDeleteAgenda}
            onOpenNewCelebration={() => {
              setEditingCelebration(null);
              setIsCelebrationModalOpen(true);
            }}
            onOpenEditCelebration={(item) => {
              setEditingCelebration(item);
              setIsCelebrationModalOpen(true);
            }}
            showNotification={showNotification}
          />
        )}

        {/* MÚSICAS / CANTOS TAB */}
        {activeTab === 'cantos' && (
          <MusicLibrary
            cantos={cantos}
            agenda={agenda}
            categorias={categorias}
            temposLiturgicos={temposLiturgicos}
            onOpenStageMode={(canto) => handleOpenStageMode(canto)}
            onEditCanto={(canto) => {
              setEditingCanto(canto);
              setIsCantoEditorOpen(true);
            }}
            onDeleteCanto={handleDeleteCanto}
            onToggleFavorite={handleToggleFavorite}
            onOpenImport={() => setIsImportModalOpen(true)}
            onOpenNewCanto={() => {
              setEditingCanto(null);
              setIsCantoEditorOpen(true);
            }}
            onAddToRepertoire={handleAddToRepertoire}
            onOpenSearchModal={handleOpenSearchModal}
          />
        )}

        {/* CELEBRAÇÕES / AGENDA TAB */}
        {activeTab === 'agenda' && (
          <RepertoireManager
            agenda={agenda}
            cantos={cantos}
            temposLiturgicos={temposLiturgicos}
            categorias={categorias}
            onOpenStageMode={handleOpenStageMode}
            onUpdateAgenda={handleSaveAgenda}
            onDeleteAgenda={handleDeleteAgenda}
            onOpenNewCelebration={() => {
              setEditingCelebration(null);
              setIsCelebrationModalOpen(true);
            }}
            onOpenEditCelebration={(item) => {
              setEditingCelebration(item);
              setIsCelebrationModalOpen(true);
            }}
            showNotification={showNotification}
          />
        )}

        {/* MÚSICOS & ESCALA TAB */}
        {activeTab === 'musicos' && (
          <MusiciansScale
            musicos={musicos}
            agenda={agenda}
            onSaveMusico={handleSaveMusico}
            onDeleteMusico={handleDeleteMusico}
            onUpdateAgenda={handleSaveAgenda}
            showNotification={showNotification}
          />
        )}

        {/* TEMPOS LITÚRGICOS TAB */}
        {activeTab === 'tempos' && (
          <TemposLiturgicosView
            temposLiturgicos={temposLiturgicos}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            onEditTempo={(tempo) => {
              showNotification(`Tempo litúrgico: ${tempo.label}`, 'info');
            }}
            showNotification={showNotification}
          />
        )}

        {/* CONFIGURAÇÕES / PERFIL TAB */}
        {activeTab === 'config' && (
          <SettingsView
            user={user}
            categorias={categorias}
            setCategorias={setCategorias}
            cantos={cantos}
            agenda={agenda}
            temposLiturgicos={temposLiturgicos}
            onImportFullBackup={(data) => {
              if (data.cantos) setCantos(data.cantos);
              if (data.agenda) setAgenda(data.agenda);
              if (data.categorias) setCategorias(data.categorias);
            }}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            showNotification={showNotification}
          />
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImport={() => setIsImportModalOpen(true)}
      />

      {/* MODAL: MODO PALCO (FULLSCREEN CHORD VIEWER) */}
      {stageModeSong && (
        <StageMode
          canto={stageModeSong}
          agenda={stageModeAgenda}
          initialIndex={stageModeIndex}
          allCantos={cantos}
          onClose={() => setStageModeSong(null)}
        />
      )}

      {/* MODAL: IMPORTAR CIFRA COM OCR & IA */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSaveCanto={handleSaveCanto}
        existingCantos={cantos}
        categorias={categorias}
        temposLiturgicos={temposLiturgicos}
        showNotification={showNotification}
      />

      {/* MODAL: BUSCA EXTERNA & IMPORTAÇÃO DE MÚSICAS / CIFRAS */}
      <SearchAndImportModal
        isOpen={isSearchAndImportModalOpen}
        onClose={() => setIsSearchAndImportModalOpen(false)}
        onSaveCanto={handleSaveCanto}
        existingCantos={cantos}
        temposLiturgicos={temposLiturgicos}
        showNotification={showNotification}
        initialQuery={searchModalInitialQuery}
        initialTab={searchModalInitialTab}
      />

      {/* MODAL: EDITAR / CRIAR CANTO COM PAUTA */}
      <CantoEditorModal
        isOpen={isCantoEditorOpen}
        onClose={() => setIsCantoEditorOpen(false)}
        onSave={handleSaveCanto}
        editingCanto={editingCanto}
        categorias={categorias}
        temposLiturgicos={temposLiturgicos}
        showNotification={showNotification}
      />

      {/* MODAL: AGENDAR / EDITAR CELEBRAÇÃO */}
      <CelebrationModal
        isOpen={isCelebrationModalOpen}
        onClose={() => setIsCelebrationModalOpen(false)}
        onSave={handleSaveAgenda}
        editingCelebration={editingCelebration}
        temposLiturgicos={temposLiturgicos}
        musicos={musicos}
        showNotification={showNotification}
      />

      {/* MODAL: BUSCA RÁPIDA (CTRL+K) */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        cantos={cantos}
        agenda={agenda}
        onOpenStageMode={(canto) => handleOpenStageMode(canto)}
        onOpenCelebration={(item) => {
          setActiveTab('repertorios');
        }}
      />

    </div>
  );
}

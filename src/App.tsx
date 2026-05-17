/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Church, 
  Calendar, 
  Music, 
  Settings, 
  Plus, 
  Search, 
  BookOpen, 
  Trash2, 
  Edit, 
  X, 
  MapPin, 
  Clock,
  ChevronRight,
  ChevronLeft,
  LayoutList,
  Maximize2,
  Minimize2,
  Minus,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
  Hourglass,
  Baby,
  Leaf,
  Cross,
  Sun,
  Moon,
  Music2,
  Download,
  Upload,
  Share2,
  FileJson,
  FileText,
  Check,
  Info,
  LogOut,
  User as UserIcon,
  Loader2,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { Canto, AgendaItem, LiturgicalSeason } from './types';
import { INITIAL_SEASONS, INITIAL_CATEGORIES, NOTES, NOTE_MAP } from './constants';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Auth } from './components/Auth';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    document.title = "Gestão Litúrgica Digital";
    if (!auth) {
      console.error("Firebase Auth not initialized. Check your configuration.");
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  // Tabs: 'tempos' | 'agenda' | 'cantos' | 'config'
  const [activeTab, setActiveTab] = useState('tempos');
  
  // Data State
  const [cantos, setCantos] = useState<Canto[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [categorias, setCategorias] = useState<string[]>(INITIAL_CATEGORIES);
  const [temposLiturgicos, setTemposLiturgicos] = useState(INITIAL_SEASONS);

  // Firestore Subscriptions
  useEffect(() => {
    if (!user || !db) {
      setCantos([]);
      setAgenda([]);
      setCategorias(INITIAL_CATEGORIES);
      setTemposLiturgicos(INITIAL_SEASONS);
      return;
    }

    const qCantos = query(collection(db, 'cantos'), where('ownerId', '==', user.uid), orderBy('nome', 'asc'));
    const unsubscribeCantos = onSnapshot(qCantos, (snapshot) => {
      setCantos(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cantos'));

    const qAgenda = query(collection(db, 'agenda'), where('ownerId', '==', user.uid), orderBy('data', 'asc'));
    const unsubscribeAgenda = onSnapshot(qAgenda, (snapshot) => {
      setAgenda(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'agenda'));

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categorias) setCategorias(data.categorias);
        if (data.temposLiturgicos && data.temposLiturgicos.length > 0) setTemposLiturgicos(data.temposLiturgicos);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    return () => {
      unsubscribeCantos();
      unsubscribeAgenda();
      unsubscribeUser();
    };
  }, [user]);

  // Selected Season for the Tempos view
  const [selectedSeason, setSelectedSeason] = useState<LiturgicalSeason | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
    } catch (e) {
      console.warn('LocalStorage access denied for theme preference.');
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch (e) {
      // Ignorar erro de armazenamento
    }
    
    // Use requestAnimationFrame para garantir que a classe seja aplicada após a montagem/render
    const updateTheme = () => {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    updateTheme();
  }, [isDarkMode]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('v5_cantos', JSON.stringify(cantos));
  }, [cantos]);

  useEffect(() => {
    localStorage.setItem('v5_agenda', JSON.stringify(agenda));
  }, [agenda]);

  useEffect(() => {
    localStorage.setItem('v5_cats', JSON.stringify(categorias));
  }, [categorias]);

  useEffect(() => {
    localStorage.setItem('v5_tempos', JSON.stringify(temposLiturgicos));
  }, [temposLiturgicos]);

  // Modal States
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaItem | null>(null);
  
  const [isCantoModalOpen, setIsCantoModalOpen] = useState(false);
  const [editingCanto, setEditingCanto] = useState<Canto | null>(null);
  
  const [isReadingModeOpen, setIsReadingModeOpen] = useState(false);
  const [isLyricsFullScreen, setIsLyricsFullScreen] = useState(false);

  // Fullscreen API Helper
  const toggleFullscreen = (enable: boolean) => {
    try {
      if (enable) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
          });
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen API not supported');
    }
  };

  useEffect(() => {
    if (isLyricsFullScreen || isReadingModeOpen) {
      toggleFullscreen(true);
    } else {
      toggleFullscreen(false);
    }
  }, [isLyricsFullScreen, isReadingModeOpen]);

  const [lyricsValue, setLyricsValue] = useState("");
  const [readingCanto, setReadingCanto] = useState<Canto | null>(null);
  const [readingAgenda, setReadingAgenda] = useState<AgendaItem | null>(null);
  const [readingIndex, setReadingIndex] = useState(0);

  useEffect(() => {
    if (editingCanto) {
      setLyricsValue(editingCanto.letra || "");
    } else {
      setLyricsValue("");
    }
  }, [editingCanto, isCantoModalOpen]);

  const [fontSize, setFontSize] = useState(20);
  const [keyOffset, setKeyOffset] = useState(0);
  const [showChords, setShowChords] = useState(true);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  // Auto-Scroll State
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const scrollAccumulatorRef = React.useRef(0);

  const activeScrollElement = scrollElement;

  // Auto-Scroll Effect
  useEffect(() => {
    if (!isAutoScrolling || !activeScrollElement) {
      scrollAccumulatorRef.current = 0;
      return;
    }

    let animationId: number;
    let lastTime = performance.now();

    const scroll = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      // Base speed: 0.04 pixels per millisecond at 1x (~40px/sec)
      const baseSpeed = 0.04; 
      scrollAccumulatorRef.current += scrollSpeed * baseSpeed * deltaTime;
      
      if (scrollAccumulatorRef.current >= 1) {
        const move = Math.floor(scrollAccumulatorRef.current);
        activeScrollElement.scrollTop += move;
        scrollAccumulatorRef.current -= move;
      }
      
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isAutoScrolling, scrollSpeed, activeScrollElement]);

  // Reset auto-scroll when opening/changing
  useEffect(() => {
    setIsAutoScrolling(false);
    scrollAccumulatorRef.current = 0;
    if (activeScrollElement) {
      activeScrollElement.scrollTop = 0;
    }
  }, [readingCanto?.id, readingAgenda?.id, readingIndex, activeScrollElement]);

  // Agenda Modal Selection State
  const [selectedCantosForAgenda, setSelectedCantosForAgenda] = useState<number[]>([]);
  const [showCantoPicker, setShowCantoPicker] = useState(false);

  // Transposition Logic
  const activeReadingCanto = useMemo(() => {
    const currentCantoId = readingAgenda?.cantosIds 
      ? readingAgenda.cantosIds[readingIndex]
      : readingCanto?.id;
    return cantos.find(c => String(c.id) === String(currentCantoId));
  }, [readingCanto, readingAgenda, readingIndex, cantos]);

  const transposeText = (text: string, offset: number) => {
    if (offset === 0) return text;

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const map: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    const chordRegex = /(\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|[\+\-ªº|])*(\([^\)]*\))?(?:\/([A-G][#b]?|[0-9]+))?(?:\b|(?=\s)|(?=[\]]))|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$))/g;

    const lines = text.split('\n');
    const transposedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return line;

      // Heuristic to detect if it's a dedicated chord/notation line
      const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
      const chordOrNotationTokens = tokens.filter(t => {
        const m = t.match(chordRegex);
        return m && m[0] === t;
      });
      const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
      
      const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t));
      const isActuallyChordLine = tokens.length > 0 && (
        (chordOrNotationTokens.length / tokens.length >= 0.6) || 
        (chordOrNotationTokens.length > 0 && !hasLongLyrics)
      );

      // Perform transposition while attempting to preserve column alignment
      let resultLine = "";
      let lastIndex = 0;
      let lineShift = 0;

      const matches = Array.from(line.matchAll(chordRegex));
      
      for (const match of matches) {
        const fullMatch = match[0];
        const matchIndex = match.index!;
        
        // Add content before the match, adjusted by previous shifts
        resultLine += line.substring(lastIndex, matchIndex);

        // If it's not a chord (just notation), keep it
        if (!/^[A-G]/i.test(fullMatch)) {
          resultLine += fullMatch;
          lastIndex = matchIndex + fullMatch.length;
          continue;
        }

        // Protection for common words in non-chord lines
        const isCommonWord = (fullMatch === 'A' || fullMatch === 'E');
        if (!isActuallyChordLine && isCommonWord && fullMatch.length === 1) {
          resultLine += fullMatch;
          lastIndex = matchIndex + fullMatch.length;
          continue;
        }

        // Transpose the chord
        const transposeChordPart = (chord: string) => {
          const rootMatch = chord.match(/^[A-G][#b]?/i);
          if (!rootMatch) return chord;
          const root = rootMatch[0].toUpperCase();
          const rest = chord.slice(root.length);
          let rootIndex = map[root];
          if (rootIndex === undefined) return chord;
          let newIndex = (rootIndex + offset) % 12;
          if (newIndex < 0) newIndex += 12;
          return notes[newIndex] + rest;
        };

        const parts = fullMatch.split('/');
        let transposed = transposeChordPart(parts[0]);
        if (parts[1]) transposed += '/' + transposeChordPart(parts[1]);

        resultLine += transposed;
        
        lastIndex = matchIndex + fullMatch.length;

        // Alignment logic: for chord lines, adjust subsequent spaces to keep following chords in their columns
        if (isActuallyChordLine) {
          const delta = transposed.length - fullMatch.length;
          if (delta > 0) {
            // New chord is longer, try to consume spaces after it to maintain alignment
            let spacesToConsume = delta;
            while (spacesToConsume > 0 && lastIndex < line.length && line[lastIndex] === ' ') {
              lastIndex++;
              spacesToConsume--;
            }
          } else if (delta < 0) {
            // New chord is shorter, add spaces after it to maintain alignment
            resultLine += ' '.repeat(Math.abs(delta));
          }
        }
      }

      // Add remaining portion of the line
      resultLine += line.substring(lastIndex);
      return resultLine;
    });

    return transposedLines.join('\n');
  };

  const transposedLetra = useMemo(() => {
    if (!activeReadingCanto) return '';
    return transposeText(activeReadingCanto.letra, keyOffset);
  }, [activeReadingCanto, keyOffset]);

  const formattedLetra = useMemo(() => {
    if (!transposedLetra) return null;
    
    // Synchronized Chord and Notation Regex with transposition logic
    const chordRegex = /(\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|[\+\-ªº|])*(\([^\)]*\))?(?:\/([A-G][#b]?|[0-9]+))?(?:\b|(?=\s)|(?=[\]]))|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$))/g;
    
    // Section markers like [Chorus], (Verso), [Primeira Parte], etc.
    const sectionRegex = /^(\[|\()(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estribilho|ponte|coda|inst|inter|fim|pre-refrão|parte|estrofe)(.*)(\]|\))$/i;

    const lines = transposedLetra.split('\n');

    return lines.map((line, lineIdx) => {
      const trimmedLine = line.trim();
      
      // 1. Detect and style Section Headers
      if (trimmedLine && (trimmedLine.startsWith('[') || sectionRegex.test(trimmedLine))) {
        const headerText = trimmedLine.startsWith('[') ? trimmedLine : `[${trimmedLine}]`;
        return (
          <div 
            key={`section-${lineIdx}`} 
            className="text-slate-900 dark:text-white font-bold text-lg mt-10 mb-5 flex items-center gap-3 border-b border-slate-100 dark:border-dark-border pb-2"
          >
            <span className="text-blue-500">#</span>
            {headerText}
          </div>
        );
      }

      // Heuristic: High chord/notation density, or no long words typically found in lyrics
      const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
      const chordOrNotationTokens = tokens.filter(t => {
        const m = t.match(chordRegex);
        return m && m[0] === t;
      });
      const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
      
      const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t));
      const isActuallyChordLine = tokens.length > 0 && (
        (chordOrNotationTokens.length / tokens.length >= 0.6) || 
        (chordOrNotationTokens.length > 0 && !hasLongLyrics)
      );

      const splitRegex = /(\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|[\+\-ªº|])*(?:\([^\)]*\))?(?:\/(?:[A-G][#b]?|[0-9]+))?(?:\b|(?=\s)|(?=[\]]))|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$))/g;
      const parts = line.split(splitRegex);

      return (
        <div 
          key={`line-${lineIdx}`} 
          className={`min-h-[1.2em] relative transition-colors ${isActuallyChordLine ? 'mb-1 opacity-90' : 'mb-0'}`}
        >
          {parts.map((part, i) => {
            const isMatch = part && part.match(chordRegex);
            
            // False positive prevention:
            // In lyrics lines, we avoid highlighting 'A' and 'E' which are extremely common Portuguese words.
            const isCommonWord = (part === 'A' || part === 'E');
            const isSingleLetterInLyrics = part && part.length === 1 && !isActuallyChordLine && isCommonWord;
            const shouldHighlight = isMatch && !isSingleLetterInLyrics;

            if (shouldHighlight) {
              if (!showChords) return null;
              
              const hasDrawingChars = /[~^┌┐─│└┘]/.test(part);

              return (
                <span
                  key={i}
                  className="font-mono transition-all inline-block select-none text-blue-600 dark:text-blue-400 font-bold relative"
                  style={{ whiteSpace: 'pre' }}
                >
                  <span className={hasDrawingChars ? 'opacity-0' : ''}>{part}</span>
                  {hasDrawingChars && (
                    <svg 
                      viewBox={`0 0 ${part.length * 20} 20`} 
                      className="absolute inset-0 w-full h-[1.3em] -top-[0.2em] overflow-visible pointer-events-none"
                      preserveAspectRatio="none"
                    >
                      {part.split('').map((char, idx) => {
                        const x = idx * 20;
                        const midX = x + 10;
                        const color = "currentColor";
                        const sw = 2;
                        if (char === '┌') return (
                          <g key={idx}>
                            <line x1={midX} y1="20" x2={midX} y2="5" stroke={color} strokeWidth={sw} />
                            <line x1={midX} y1="5" x2={x + 20} y2="5" stroke={color} strokeWidth={sw} />
                          </g>
                        );
                        if (char === '┐') return (
                          <g key={idx}>
                            <line x1={midX} y1="20" x2={midX} y2="5" stroke={color} strokeWidth={sw} />
                            <line x1={x} y1="5" x2={midX} y2="5" stroke={color} strokeWidth={sw} />
                          </g>
                        );
                        if (char === '─') return <line key={idx} x1={x} y1="5" x2={x + 20} y2="5" stroke={color} strokeWidth={sw} />;
                        if (char === '│') return <line key={idx} x1={midX} y1="0" x2={midX} y2="20" stroke={color} strokeWidth={sw} />;
                        if (char === '└') return (
                          <g key={idx}>
                            <line x1={midX} y1="0" x2={midX} y2="15" stroke={color} strokeWidth={sw} />
                            <line x1={midX} y1="15" x2={x + 20} y2="15" stroke={color} strokeWidth={sw} />
                          </g>
                        );
                        if (char === '┘') return (
                          <g key={idx}>
                            <line x1={midX} y1="0" x2={midX} y2="15" stroke={color} strokeWidth={sw} />
                            <line x1={x} y1="15" x2={midX} y2="15" stroke={color} strokeWidth={sw} />
                          </g>
                        );
                        return null;
                      })}
                      {(part.includes('~') || part.includes('^')) && (
                        <path 
                          d={`M 2 16 Q ${part.length * 10} -4 ${part.length * 20 - 2} 16`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                  )}
                </span>
              );
            }
            return (
              <span 
                key={i} 
                className={`${trimmedLine === '' ? '' : 'text-slate-800 dark:text-slate-300'}`}
              >
                {part}
              </span>
            );
          })}
        </div>
      );
    });
  }, [transposedLetra, showChords]);

  const [searchCanto, setSearchCanto] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterMoment, setFilterMoment] = useState('todos');
  const [filterYear, setFilterYear] = useState('todos');

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchCanto);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchCanto]);

  // Calculated State
  const currentKey = useMemo(() => {
    if (!activeReadingCanto) return '';
    const canto = activeReadingCanto;

    if (!canto.tom) return String(keyOffset > 0 ? `+${keyOffset}` : keyOffset);
    if (keyOffset === 0) return String(canto.tom).toUpperCase();

    // Reuse the transposition logic for the display key
    const transposeChordPart = (chord: string, offset: number) => {
      const rootMatch = chord.match(/^[A-G][#b]?/i);
      if (!rootMatch) return chord;
      const root = rootMatch[0].toUpperCase();
      const rest = chord.slice(root.length);
      
      let rootIndex = NOTE_MAP[root];
      if (rootIndex === undefined) return chord;

      let newIndex = (rootIndex + offset) % 12;
      if (newIndex < 0) newIndex += 12;

      return NOTES[newIndex] + rest;
    };

    return String(transposeChordPart(canto.tom, keyOffset)).toUpperCase();
  }, [readingCanto?.tom, keyOffset, readingAgenda, readingIndex, cantos]);

  // Helpers
  const getSeasonInfo = (id: string) => {
    return temposLiturgicos.find(t => t.id === id) || temposLiturgicos[temposLiturgicos.length - 1];
  };

  const getSeasonIcon = (id: string | undefined) => {
    if (!id) return <Music2 className="w-6 h-6" />;
    const info = temposLiturgicos.find(t => t.id === id);
    const iconName = info?.icon || 'music';

    switch (iconName) {
      case 'hourglass': return <Hourglass className="w-6 h-6" />;
      case 'baby': return <Baby className="w-6 h-6" />;
      case 'leaf': return <Leaf className="w-6 h-6" />;
      case 'cross': return <Cross className="w-6 h-6" />;
      case 'sun': return <Sun className="w-6 h-6" />;
      case 'music': return <Music2 className="w-6 h-6" />;
      default: return <Music2 className="w-6 h-6" />;
    }
  };

  const filteredCantos = useMemo(() => {
    return cantos.filter(c => {
      const matchesSearch = c.nome.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                           c.letra.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesMoment = filterMoment === 'todos' || c.tipo === filterMoment;
      const matchesYear = filterYear === 'todos' || c.ano === filterYear;
      return matchesSearch && matchesMoment && matchesYear;
    });
  }, [cantos, debouncedSearch, filterMoment, filterYear]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const instances: AgendaItem[] = [];

    agenda.forEach(item => {
      if (!item.recorrencia || item.recorrencia === 'unica') {
        if (new Date(item.data).getTime() >= now.getTime() - (3 * 60 * 60 * 1000)) { // 3h margin
          instances.push(item);
        }
      } else {
        // Calculate next occurrence
        let current = new Date(item.data);
        while (current.getTime() < now.getTime() - (12 * 60 * 60 * 1000)) { // 12h margin to keep showing on the day
          if (item.recorrencia === 'mensal') current.setMonth(current.getMonth() + 1);
          else if (item.recorrencia === 'anual') current.setFullYear(current.getFullYear() + 1);
          else break;
        }
        instances.push({
          ...item,
          data: current.toISOString()
        });
      }
    });

    return instances
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 5);
  }, [agenda]);

  const getCantosBySeason = (season: LiturgicalSeason) => {
    return cantos.filter(c => c.season === season);
  };

  // Actions: Agenda
  const handleSaveAgenda = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const titulo = formData.get('titulo') as string;
    const local = formData.get('local') as string;
    const data = formData.get('data') as string;
    const recorrencia = formData.get('recorrencia') as 'unica' | 'mensal' | 'anual';
    const syncGoogle = formData.get('syncGoogle') === 'on';

    if (!titulo || !data) return;

    const newItem = {
      titulo,
      local,
      data,
      recorrencia: recorrencia || 'unica',
      cantosIds: selectedCantosForAgenda,
      ownerId: user.uid,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingAgenda) {
        await updateDoc(doc(db, 'agenda', String(editingAgenda.id)), newItem);
        showNotification(`Evento "${titulo}" atualizado com sucesso.`, 'success');
      } else {
        await addDoc(collection(db, 'agenda'), {
          ...newItem,
          createdAt: serverTimestamp()
        });
        showNotification(`Evento "${titulo}" criado com sucesso.`, 'success');
      }

      if (syncGoogle) {
        const gStart = data.replace(/[-:]/g, '') + '00';
        const dateObj = new Date(data);
        dateObj.setHours(dateObj.getHours() + 1);
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        const gEnd = dateObj.getFullYear() + 
                     pad(dateObj.getMonth() + 1) + 
                     pad(dateObj.getDate()) + 'T' + 
                     pad(dateObj.getHours()) + 
                     pad(dateObj.getMinutes()) + '00';

        const selectedCantosList = selectedCantosForAgenda
          .map(id => cantos.find(c => String(c.id) === String(id))?.nome)
          .filter(Boolean)
          .join('\n');
        
        const details = selectedCantosList ? `Músicas vinculadas:\n${selectedCantosList}` : '';
        
        let googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&location=${encodeURIComponent(local)}&dates=${gStart}/${gEnd}&details=${encodeURIComponent(details)}`;
        
        if (recorrencia === 'mensal') googleUrl += '&recur=RRULE:FREQ=MONTHLY';
        if (recorrencia === 'anual') googleUrl += '&recur=RRULE:FREQ=YEARLY';

        window.open(googleUrl, '_blank');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'agenda');
    }

    setIsAgendaModalOpen(false);
    setEditingAgenda(null);
    setSelectedCantosForAgenda([]);
    setShowCantoPicker(false);
  };

  const handleDeleteAgenda = async (id: string | number) => {
    const item = agenda.find(a => String(a.id) === String(id));
    if (confirm(`Tem certeza que deseja excluir o evento "${item?.titulo}"?`)) {
      try {
        await deleteDoc(doc(db, 'agenda', String(id)));
        showNotification('Evento excluído.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `agenda/${id}`);
      }
    }
  };

  // Actions: Cantos
  const handleSaveCanto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const letra = formData.get('letra') as string;
    const ano = formData.get('ano') as 'A' | 'B' | 'C' | 'Geral';
    const tipo = formData.get('tipo') as string;
    const season = formData.get('season') as LiturgicalSeason;
    const tom = formData.get('tom') as string;
    const bpm = formData.get('bpm') ? Number(formData.get('bpm')) : null;
    const compasso = formData.get('compasso') as string;

    if (!nome) return;

    const newItem = {
      nome,
      letra,
      ano,
      tipo,
      season,
      tom,
      bpm,
      compasso,
      ownerId: user.uid,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingCanto) {
        await updateDoc(doc(db, 'cantos', String(editingCanto.id)), newItem);
        showNotification(`Música "${nome}" atualizada com sucesso.`, 'success');
      } else {
        await addDoc(collection(db, 'cantos'), {
          ...newItem,
          createdAt: serverTimestamp()
        });
        showNotification(`Música "${nome}" adicionada ao repertório.`, 'success');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cantos');
    }

    setIsCantoModalOpen(false);
    setEditingCanto(null);
  };

  const handleDeleteCanto = async (id: string | number) => {
    const item = cantos.find(c => String(c.id) === String(id));
    if (confirm(`Tem certeza que deseja excluir a música "${item?.nome}"?`)) {
      try {
        await deleteDoc(doc(db, 'cantos', String(id)));
        showNotification('Música removida do repertório.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `cantos/${id}`);
      }
    }
  };

  // Actions: Categories
  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const nova = formData.get('nova') as string;
    if (nova && !categorias.includes(nova)) {
      const updated = [...categorias, nova];
      try {
        await updateDoc(doc(db, 'users', user.uid), { categorias: updated });
        showNotification(`Momento "${nova}" adicionado.`, 'success');
        e.currentTarget.reset();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    if (!user) return;
    const updated = categorias.filter(c => c !== cat);
    try {
      await updateDoc(doc(db, 'users', user.uid), { categorias: updated });
      showNotification(`Momento "${cat}" removido.`, 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleExportData = () => {
    try {
      const data = {
        version: '1.0',
        cantos,
        agenda,
        categorias,
        temposLiturgicos,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_completo_liturgia_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification('Backup exportado com sucesso. Verifique seus downloads.', 'success');
    } catch (err) {
      showNotification('Falha ao exportar backup.', 'error');
      console.error('Export Error:', err);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    console.log('Import: Iniciando leitura do arquivo:', file.name);

    try {
      const text = await file.text();
      if (!text || text.trim() === '') {
        showNotification('O arquivo selecionado está vazio.', 'error');
        return;
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e: any) {
        console.error('Import: Erro ao parsear JSON:', e);
        showNotification(`Erro de formato JSON: ${e.message}`, 'error');
        return;
      }

      console.log('Import: Dados JSON carregados:', json);

      // 1. Individual song import
      const isSong = json.nome && json.letra !== undefined && !json.cantos;
      if (isSong) {
        if (confirm(`Deseja importar a música "${json.nome}"?`)) {
          const { id, ...songData } = json;
          const song = {
            ano: ['A', 'B', 'C', 'Geral'].includes(songData.ano) ? songData.ano : 'Geral',
            tipo: songData.tipo || 'Outros',
            nome: songData.nome,
            letra: songData.letra,
            season: songData.season || 'Comum',
            tom: songData.tom || '',
            bpm: songData.bpm ? Number(songData.bpm) : null,
            compasso: songData.compasso || '',
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await addDoc(collection(db, 'cantos'), song);
          setActiveTab('cantos');
          showNotification(`Música "${json.nome}" importada com sucesso.`, 'success');
        }
        return;
      }

      // 2. Full Backup or Song Array
      const hasCantos = Array.isArray(json.cantos);
      const isArrayOfSongs = Array.isArray(json) && json.length > 0 && json[0].nome && json[0].letra !== undefined;

      if (hasCantos || isArrayOfSongs) {
        const msg = isArrayOfSongs 
          ? `Deseja importar uma lista com ${json.length} músicas?` 
          : 'Deseja restaurar este backup do sistema? Isso substituirá seus dados atuais em nuvem.';
        
        if (confirm(msg)) {
          const incomingCantos = isArrayOfSongs ? json : (json.cantos || []);
          
          // Import songs sequentially to avoid rate limits/conflicts
          for (const c of incomingCantos) {
            const { id: _, ...cantoData } = c;
            await addDoc(collection(db, 'cantos'), {
              ...cantoData,
              ownerId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }

          if (!isArrayOfSongs) {
            if (json.agenda) {
              for (const a of json.agenda) {
                const { id: __, ...agendaData } = a;
                await addDoc(collection(db, 'agenda'), {
                  ...agendaData,
                  ownerId: user.uid,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              }
            }
            if (json.categorias || json.temposLiturgicos) {
              await updateDoc(doc(db, 'users', user.uid), {
                categorias: json.categorias || categorias,
                temposLiturgicos: json.temposLiturgicos || temposLiturgicos
              });
            }
          }
          
          setActiveTab('cantos');
          showNotification('Dados importados para a nuvem com sucesso.', 'success');
        }
      } else {
        console.warn('Import: Formato não reconhecido.', json);
        showNotification('O arquivo não foi reconhecido como um formato válido de música ou backup.', 'error');
      }
    } catch (err: any) {
      console.error('Import: Erro crítico:', err);
      showNotification(`Erro ao importar dados: ${err.message || 'Erro desconhecido'}`, 'error');
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const exportCantoAsPDF = (canto: Canto, currentKey?: string, transposedLyrics?: string, showChords: boolean = true) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const marginX = 18;
      const marginY = 20;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = 174; 
      let cursorY = marginY;

      const fontSizeBody = 12; 
      const fontSizeTitle = 16;
      const fontSizeInfo = 11;
      const lineSpacing = 1.3;
      let lineStep = (fontSizeBody * 0.3527) * lineSpacing; 

      const chordRegex = /(\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|[\+\-ªº|])*(\([^\)]*\))?(?:\/([A-G][#b]?|[0-9]+))?(?:\b|(?=\s)|(?=[\]]))|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$))/g;
      const sectionRegex = /^(\[|\()(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estribilho|ponte|coda|inst|inter|fim|pre-refrão|parte|estrofe)(.*)(\]|\))$/i;

      const ensurePdfSafeChars = (text: string) => {
        return text.replace(/[ª]/g, 'a').replace(/[º°ø]/g, 'o');
      };

      const checkPageBreak = (neededHeight: number) => {
        if (cursorY + neededHeight > pageHeight - marginY) {
          doc.addPage();
          cursorY = marginY;
          return true;
        }
        return false;
      };

      const drawSpecialSymbols = (line: string, x: number, y: number, charWidth: number, scale: number = 1.0) => {
        const cW = charWidth;
        const thickness = 0.3 * scale;
        doc.setLineWidth(thickness);
        doc.setDrawColor(30, 41, 59);

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const currX = x + (i * cW);
          const topY = y - (3.5 * scale);
          const bottomY = y + (0.5 * scale);
          const midX = currX + (cW / 2);
          
          if (char === '┌' || char === '%m') {
            doc.line(midX, bottomY, midX, topY + (0.4 * scale)); 
            doc.line(midX + (0.4 * scale), topY, currX + cW, topY);
            doc.line(midX, topY + (0.4 * scale), midX + (0.4 * scale), topY);
          } else if (char === '┐' || char === '%n') {
            doc.line(midX, bottomY, midX, topY + (0.4 * scale));
            doc.line(currX, topY, midX - (0.4 * scale), topY);
            doc.line(midX - (0.4 * scale), topY, midX, topY + (0.4 * scale));
          } else if (char === '─' || char === '%') {
            doc.line(currX, topY, currX + cW, topY);
          } else if (char === '│' || char === '|') {
            doc.line(midX, y - (4 * scale), midX, y + (1 * scale));
          } else if (char === '~' || char === '^') {
            // Simple arch using lines for maximum compatibility
            doc.line(currX + (0.1 * cW), bottomY, midX, topY - (0.5 * scale));
            doc.line(midX, topY - (0.5 * scale), currX + cW - (0.1 * cW), bottomY);
          } else if (char === '└') {
            doc.line(midX, topY, midX, bottomY - (0.4 * scale));
            doc.line(midX + (0.4 * scale), bottomY, currX + cW, bottomY);
            doc.line(midX, bottomY - (0.4 * scale), midX + (0.4 * scale), bottomY);
          } else if (char === '┘') {
            doc.line(midX, topY, midX, bottomY - (0.4 * scale));
            doc.line(currX, bottomY, midX - (0.4 * scale), bottomY);
            doc.line(midX - (0.4 * scale), bottomY, midX, bottomY - (0.4 * scale));
          }
        }
      };

      // 1. Calculate Scaling
      const baseLyrics = (transposedLyrics && transposedLyrics.trim() !== '') ? transposedLyrics : canto.letra;
      const rawLines = baseLyrics.split('\n');
      doc.setFont('courier', 'normal');
      doc.setFontSize(fontSizeBody);
      let maxLineW = 0;
      rawLines.forEach(l => {
        const w = doc.getTextWidth(l);
        if (w > maxLineW) maxLineW = w;
      });
      let pageScale = 1.0;
      if (maxLineW > contentWidth) {
        pageScale = Math.max(0.95, contentWidth / maxLineW);
      }
      const activeFontSize = fontSizeBody * pageScale;
      lineStep = (activeFontSize * 0.3527) * lineSpacing;

      // 2. Main Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(15, 23, 42); 
      doc.text(canto.nome, marginX, cursorY);
      cursorY += (fontSizeTitle * 0.3527) + 4;

      // 3. Info Line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSizeInfo);
      doc.setTextColor(71, 85, 105);
      const infoText = `Tom: ${currentKey || canto.tom} | Momento: ${canto.tipo} | Ano: ${canto.ano || 'Geral'}${canto.bpm ? ` | BPM: ${canto.bpm}` : ''}${canto.compasso ? ` | Compasso: ${canto.compasso}` : ''}`;
      doc.text(infoText, marginX, cursorY);
      cursorY += 15;

      const lines = rawLines;
      const blocks: { type: 'section' | 'content', lines: string[] }[] = [];
      let currentBlockLines: string[] = [];

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && (trimmed.startsWith('[') || sectionRegex.test(trimmed))) {
          if (currentBlockLines.length > 0) blocks.push({ type: 'content', lines: [...currentBlockLines] });
          blocks.push({ type: 'section', lines: [line] });
          currentBlockLines = [];
        } else {
          currentBlockLines.push(line);
        }
      });
      if (currentBlockLines.length > 0) blocks.push({ type: 'content', lines: currentBlockLines });

      blocks.forEach(block => {
        const blockHeight = block.lines.length * lineStep + (block.type === 'section' ? 4 : 0);
        checkPageBreak(block.type === 'section' ? lineStep * 3 : Math.min(blockHeight, 25));

        block.lines.forEach((line, lineIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
            cursorY += lineStep;
            return;
          }

          if (block.type === 'section') {
            const headerText = trimmedLine.startsWith('[') ? trimmedLine : `[${trimmedLine}]`;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.text(ensurePdfSafeChars(headerText), marginX, cursorY);
            cursorY += lineStep + 2;
            return;
          }

          const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
          const chordOrNotationTokens = tokens.filter(t => {
            const m = t.match(chordRegex);
            return m && m[0] === t;
          });
          const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
          const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t));
          const isChordLine = tokens.length > 0 && (
            (chordOrNotationTokens.length / tokens.length >= 0.6) || 
            (chordOrNotationTokens.length > 0 && !hasLongLyrics)
          );

          if (isChordLine && !showChords) return;

          doc.setFont('courier', isChordLine ? 'bold' : 'normal');
          doc.setFontSize(activeFontSize);
          if (isChordLine) {
            doc.setTextColor(30, 41, 59);
          } else {
            doc.setTextColor(51, 65, 85);
          }

          if (isChordLine && block.lines[lineIdx + 1] && block.lines[lineIdx + 1].trim()) {
            checkPageBreak(lineStep * 2.5);
          } else {
            checkPageBreak(lineStep);
          }

          const charWidth = doc.getTextWidth(' ');
          drawSpecialSymbols(line, marginX, cursorY, charWidth, pageScale);
          const textLine = ensurePdfSafeChars(line.replace(/[┌┐─│~^└┘|]/g, ' '));
          
          if (doc.getTextWidth(textLine) > contentWidth + 0.5) {
             const wrapLines = doc.splitTextToSize(textLine, contentWidth);
             wrapLines.forEach((wl: string, widx: number) => {
               if (widx > 0) checkPageBreak(lineStep);
               doc.text(wl, marginX, cursorY);
               if (widx < wrapLines.length - 1) cursorY += lineStep;
             });
          } else {
             doc.text(textLine, marginX, cursorY);
          }
          
          cursorY += lineStep;
        });
        
        cursorY += 2; 
      });

      doc.save(`${canto.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      showNotification(`Musica "${canto.nome}" exportada para PDF com sucesso.`, 'success');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showNotification('Erro interno na exportação PDF.', 'error');
    }
  };


  const exportFolhetoAsPDF = (agenda: AgendaItem) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const marginX = 18;
      const marginY = 20;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = 174;
      let cursorY = marginY;

      const fontSizeBody = 11;
      const fontSizeTitle = 22;
      const lineSpacing = 1.3;
      let lineStep = (fontSizeBody * 0.3527) * lineSpacing;

      const chordRegex = /(\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|[\+\-ªº|])*(\([^\)]*\))?(?:\/([A-G][#b]?|[0-9]+))?(?:\b|(?=\s)|(?=[\]]))|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$))/g;
      const sectionRegex = /^(\[|\()(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estribilho|ponte|coda|inst|inter|fim|pre-refrão|parte|estrofe)(.*)(\]|\))$/i;

      const ensurePdfSafeChars = (text: string) => {
        return text.replace(/[ª]/g, 'a').replace(/[º°ø]/g, 'o');
      };

      const checkPageBreak = (neededHeight: number) => {
        if (cursorY + neededHeight > pageHeight - marginY) {
          doc.addPage();
          cursorY = marginY;
          return true;
        }
        return false;
      };

      const drawSpecialSymbols = (line: string, x: number, y: number, charWidth: number, scale: number = 1.0) => {
        const cW = charWidth;
        const thickness = 0.25 * scale;
        doc.setLineWidth(thickness);
        doc.setDrawColor(30, 41, 59);

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const currX = x + (i * cW);
          const topY = y - (2.8 * scale);
          const bottomY = y + (0.4 * scale);
          const midX = currX + (cW / 2);
          
          if (char === '┌') {
            doc.line(midX, bottomY, midX, topY + (0.4 * scale)); 
            doc.line(midX + (0.4 * scale), topY, currX + cW, topY);
            doc.line(midX, topY + (0.4 * scale), midX + (0.4 * scale), topY);
          } else if (char === '┐') {
            doc.line(midX, bottomY, midX, topY + (0.4 * scale));
            doc.line(currX, topY, midX - (0.4 * scale), topY);
            doc.line(midX - (0.4 * scale), topY, midX, topY + (0.4 * scale));
          } else if (char === '─') {
            doc.line(currX, topY, currX + cW, topY);
          } else if (char === '│' || char === '|') {
            doc.line(midX, y - (3 * scale), midX, y + (1 * scale));
          } else if (char === '└') {
            doc.line(midX, topY, midX, bottomY - (0.4 * scale));
            doc.line(midX + (0.4 * scale), bottomY, currX + cW, bottomY);
            doc.line(midX, bottomY - (0.4 * scale), midX + (0.4 * scale), bottomY);
          } else if (char === '┘') {
            doc.line(midX, topY, midX, bottomY - (0.4 * scale));
            doc.line(currX, bottomY, midX - (0.4 * scale), bottomY);
            doc.line(midX - (0.4 * scale), bottomY, midX, bottomY - (0.4 * scale));
          }
        }
      };

      // Main Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(15, 23, 42);
      doc.text(agenda.titulo, marginX, cursorY);
      cursorY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const eventDate = new Date(agenda.data);
      const dateText = `${eventDate.toLocaleDateString('pt-BR')} ${eventDate.toLocaleTimeString('pt-BR', {timeStyle: 'short'})} | Local: ${agenda.local || 'Não definido'}`;
      doc.text(dateText, marginX, cursorY);
      cursorY += 15;

      if (!agenda.cantosIds || agenda.cantosIds.length === 0) {
        doc.setFontSize(12);
        doc.text("Nenhuma música vinculada a este roteiro.", marginX, cursorY);
      } else {
        agenda.cantosIds.forEach((id, idx) => {
          const canto = cantos.find(c => String(c.id) === String(id));
          if (!canto) return;

          checkPageBreak(30);
          cursorY += 10;
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${canto.nome}`, marginX, cursorY);
          cursorY += 6;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(`${canto.tipo} | Tom: ${canto.tom}`, marginX, cursorY);
          cursorY += 10;

          const cantoLines = canto.letra.split('\n');
          
          // Pre-calculate scaling for the song
          doc.setFont('courier', 'normal');
          doc.setFontSize(fontSizeBody);
          let songMaxW = 0;
          cantoLines.forEach(l => {
            const w = doc.getTextWidth(l);
            if (w > songMaxW) songMaxW = w;
          });
          let songScale = 1.0;
          if (songMaxW > contentWidth) {
            songScale = Math.max(0.95, contentWidth / songMaxW);
          }
          const songFontSize = fontSizeBody * songScale;
          const songLineStep = (songFontSize * 0.3527) * lineSpacing;

          cantoLines.forEach((line, lIdx) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              cursorY += songLineStep;
              return;
            }

            if (trimmedLine.startsWith('[') || sectionRegex.test(trimmedLine)) {
              checkPageBreak(songLineStep * 2);
              const headerText = trimmedLine.startsWith('[') ? trimmedLine : `[${trimmedLine}]`;
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(15, 23, 42);
              doc.setFontSize(10);
              doc.text(ensurePdfSafeChars(headerText), marginX, cursorY);
              cursorY += 9;
              return;
            }

            const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
            const chordOrNotationTokens = tokens.filter(t => {
              const m = t.match(chordRegex);
              return m && m[0] === t;
            });
            const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
            const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t));
            const isChordLine = tokens.length > 0 && (
              (chordOrNotationTokens.length / tokens.length >= 0.6) || 
              (chordOrNotationTokens.length > 0 && !hasLongLyrics)
            );

            if (isChordLine && cantoLines[lIdx + 1] && cantoLines[lIdx + 1].trim()) {
              checkPageBreak(songLineStep * 2.5);
            } else {
              checkPageBreak(songLineStep);
            }

            doc.setFont('courier', isChordLine ? 'bold' : 'normal');
            doc.setFontSize(songFontSize);
            if (isChordLine) {
              doc.setTextColor(30, 41, 59);
            } else {
              doc.setTextColor(51, 65, 85);
            }

            const charWidth = doc.getTextWidth(' ');
            drawSpecialSymbols(line, marginX, cursorY, charWidth, songScale);
            const textLine = ensurePdfSafeChars(line.replace(/[┌┐─│~^└┘|]/g, ' '));
            
            if (doc.getTextWidth(textLine) > contentWidth + 0.5) {
              const wrapLines = doc.splitTextToSize(textLine, contentWidth);
              wrapLines.forEach((wl: string, widx: number) => {
                if (widx > 0) checkPageBreak(songLineStep);
                doc.text(wl, marginX, cursorY);
                if (widx < wrapLines.length - 1) cursorY += songLineStep;
              });
            } else {
              doc.text(textLine, marginX, cursorY);
            }
            
            cursorY += (songLineStep);
          });
          
          cursorY += 12; 
        });
      }

      doc.save(`folheto_${agenda.titulo.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      showNotification(`Folheto "${agenda.titulo}" exportado com sucesso.`, 'success');
    } catch (err) {
      console.error('Folheto PDF Export Error:', err);
      showNotification('Erro ao exportar folheto.', 'error');
    }
  };

  const exportCantoAsJSON = (canto: Canto) => {
    try {
      const blob = new Blob([JSON.stringify(canto, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${canto.nome.toLowerCase().replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification(`Arquivo JSON de "${canto.nome}" exportado para downloads.`, 'success');
    } catch (err) {
      showNotification('Erro ao exportar música como JSON.', 'error');
      console.error('JSON Export Error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold font-serif">Iniciando Liturgia Digital...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center p-4">
        <div className="container max-w-lg">
          <div className="text-center text-white mb-10">
            <div className="inline-flex p-4 bg-white/10 rounded-3xl backdrop-blur-md mb-6">
              <Church className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-serif font-black mb-3 leading-tight tracking-tight">Gestão Litúrgica Digital</h1>
            <p className="text-blue-200 font-medium">Sua ferramenta completa para organização de cantos e agenda paroquial.</p>
          </div>
          <Auth />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-dark-bg min-h-screen text-slate-900 dark:text-dark-text font-sans pb-24 transition-colors duration-300">
      {/* Navbar */}
      <nav className="bg-blue-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center px-4">
          <h1 className="text-xl font-bold flex items-center tracking-tight gap-2">
            <Church className="w-6 h-6" /> 
            <span className="hidden sm:inline">Gestão Litúrgica Digital</span>
            <span className="sm:hidden">Liturgia Digital</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest leading-none">Usuário</span>
              <span className="text-xs font-bold">{user.displayName || user.email}</span>
            </div>
            <button 
              onClick={() => {
                if (confirm('Deseja realmente sair?')) {
                  signOut(auth);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-200 hover:text-white"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-white dark:bg-dark-surface shadow-md sticky top-[60px] z-40 transition-colors">
        <div className="container mx-auto flex justify-around">
          {[
            { id: 'tempos', icon: <Calendar className="w-5 h-5" />, label: 'TEMPOS' },
            { id: 'agenda', icon: <Clock className="w-5 h-5" />, label: 'AGENDA' },
            { id: 'cantos', icon: <Music className="w-5 h-5" />, label: 'REPERTÓRIO' },
            { id: 'config', icon: <Settings className="w-5 h-5" />, label: 'CONFIGURAÇÕES' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-4 px-2 w-full text-[10px] font-bold tracking-wider transition-all
                ${activeTab === tab.id 
                  ? 'text-blue-700 dark:text-blue-400 border-b-4 border-blue-700 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' 
                  : 'text-slate-500 dark:text-slate-400 border-b-4 border-transparent hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* TEMPOS SECTION */}
          {activeTab === 'tempos' && (
            <motion.section 
              key="tempos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-serif font-bold text-blue-900 dark:text-blue-400">Ciclos Litúrgicos</h2>
                <p className="text-slate-500 dark:text-slate-400">Explore o calendário litúrgico e encontre cantos específicos para cada tempo.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {temposLiturgicos.map(season => (
                  <motion.button
                    key={season.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSeason(selectedSeason === season.id ? null : season.id)}
                    className={`relative overflow-hidden bg-white dark:bg-dark-surface p-6 rounded-2xl border-l-[6px] shadow-md text-left transition-all hover:shadow-lg
                      ${season.borderColor} ${selectedSeason === season.id ? 'ring-2 ring-blue-500' : 'border-transparent sm:border-l-[6px]'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-xl text-white ${season.color}`}>
                        {getSeasonIcon(season.id)}
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-300 dark:text-slate-600 transition-transform ${selectedSeason === season.id ? 'rotate-90' : ''}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{season.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{season.description}</p>
                  </motion.button>
                ))}
              </div>

              {/* Sub-list of songs for the selected season */}
              <AnimatePresence>
                {selectedSeason && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm transition-colors"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2">
                          <Music className="w-5 h-5" />
                          Cantos de {selectedSeason}
                        </h3>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full font-bold">
                          {getCantosBySeason(selectedSeason).length} músicas
                        </span>
                      </div>
                      
                      {getCantosBySeason(selectedSeason).length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-dark-bg rounded-xl border-2 border-dashed border-slate-200 dark:border-dark-border">
                          <Music2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 dark:text-slate-400">Nenhum canto cadastrado para este tempo.</p>
                          <button 
                            onClick={() => {
                              const s = temposLiturgicos.find(x => x.id === selectedSeason);
                              setEditingCanto(null);
                              setIsCantoModalOpen(true);
                            }}
                            className="mt-4 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            + Adicionar primeiro canto
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {getCantosBySeason(selectedSeason).map(canto => (
                              <div 
                                key={canto.id} 
                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-bg rounded-xl border border-slate-100 dark:border-dark-border hover:border-blue-200 dark:hover:border-blue-800 transition-colors group"
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{canto.tipo}</span>
                                  <span className="font-bold text-slate-800 dark:text-white">{canto.nome}</span>
                                </div>
                                <button 
                                  onClick={() => {
                                    setReadingCanto(canto);
                                    setKeyOffset(0); // Reset transpose
                                    setIsReadingModeOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  <BookOpen className="w-5 h-5" />
                                </button>
                              </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}

          {/* AGENDA SECTION */}
          {activeTab === 'agenda' && (
            <motion.section 
              key="agenda"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-blue-900">Agenda</h2>
                  <p className="text-slate-500">Compromissos e celebrações paroquiais.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingAgenda(null);
                    setIsAgendaModalOpen(true);
                  }}
                  className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {upcomingEvents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Próximos 5 Eventos
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                    {upcomingEvents.map(item => (
                      <motion.div 
                        key={`upcoming-${item.id}`}
                        whileHover={{ y: -4 }}
                        onClick={() => {
                          setEditingAgenda(item);
                          setIsAgendaModalOpen(true);
                        }}
                        className="min-w-[280px] bg-blue-900 text-white p-5 rounded-3xl shadow-xl shadow-blue-200/50 cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Calendar className="w-20 h-20" />
                        </div>
                        <div className="relative z-10">
                          <span className="text-[10px] font-black opacity-60 uppercase tracking-tighter">
                            {new Date(item.data).toLocaleDateString('pt-BR', { weekday: 'long' })}
                          </span>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-lg leading-tight line-clamp-1">{item.titulo}</h4>
                            {item.recorrencia && item.recorrencia !== 'unica' && (
                              <div className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                <RefreshCcw className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center text-xs font-bold bg-white/10 px-2 py-1 rounded-lg w-fit mb-2">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(item.data).toLocaleTimeString('pt-BR', { timeStyle: 'short' })}
                          </div>
                          <div className="flex items-center text-[10px] opacity-80">
                            <MapPin className="w-3 h-3 mr-1" />
                            {item.local || 'Local não definido'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Todos os Compromissos
                </h3>
                {agenda.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                    <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium font-serif text-lg">Sua agenda está vazia</p>
                  </div>
                ) : (
                  agenda.map(originalItem => {
                    let effectiveData = originalItem.data;
                    if (originalItem.recorrencia && originalItem.recorrencia !== 'unica') {
                      const now = new Date();
                      let current = new Date(originalItem.data);
                      while (current.getTime() < now.getTime() - (12 * 60 * 60 * 1000)) {
                        if (originalItem.recorrencia === 'mensal') current.setMonth(current.getMonth() + 1);
                        else if (originalItem.recorrencia === 'anual') current.setFullYear(current.getFullYear() + 1);
                        else break;
                      }
                      effectiveData = current.toISOString();
                    }
                    const item = { ...originalItem, data: effectiveData };
                    const eventDate = new Date(item.data);
                    const isValidDate = !isNaN(eventDate.getTime());

                    return (
                      <div key={item.id} className="bg-white dark:bg-dark-surface p-5 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100 dark:border-dark-border hover:shadow-md transition-shadow">
                        <div 
                          className="cursor-pointer flex-1"
                          onClick={() => {
                            setEditingAgenda(originalItem);
                            setSelectedCantosForAgenda(originalItem.cantosIds || []);
                            setIsAgendaModalOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-xl text-blue-900 dark:text-blue-400 leading-tight">{item.titulo}</h4>
                            {originalItem.recorrencia && originalItem.recorrencia !== 'unica' && (
                              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                <RefreshCcw className="w-2.5 h-2.5" />
                                {originalItem.recorrencia === 'mensal' ? 'Mensal' : 'Anual'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 mt-2">
                            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                              <MapPin className="w-3 h-3 mr-1" />
                              {item.local || 'Local não definido'}
                            </div>
                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                              <Clock className="w-3 h-3 mr-1" />
                              {isValidDate ? eventDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data inválida'}
                            </div>
                          </div>
                        </div>
                          <div className="flex gap-2">

                         <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportFolhetoAsPDF(item);
                          }}
                          className={`p-2 rounded-xl transition-all ${item.cantosIds?.length ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-300'}`}
                          title="Gerar PDF do Folheto"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                         <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.cantosIds && item.cantosIds.length > 0) {
                              setReadingAgenda(item);
                              setReadingIndex(0);
                              setReadingCanto(null); // Clear direct canto if using agenda
                              setKeyOffset(0);
                              setIsReadingModeOpen(true);
                            } else {
                              alert('Nenhuma música vinculada a este evento. Edite o evento para adicionar músicas.');
                            }
                          }}
                          className={`p-2 rounded-xl transition-all ${item.cantosIds?.length ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-300'}`}
                          title="Abrir Folheto da Missa"
                        >
                          <BookOpen className="w-5 h-5" />
                        </button>
                         <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAgenda(item);
                            setSelectedCantosForAgenda(item.cantosIds || []);
                            setIsAgendaModalOpen(true);
                          }}
                          className="p-2 text-slate-300 hover:text-blue-500"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAgenda(item.id);
                          }}
                          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir Compromisso"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </motion.section>
          )}

          {/* CANTOS SECTION */}
          {activeTab === 'cantos' && (
            <motion.section 
              key="cantos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-blue-900 dark:text-blue-400">Músicas Litúrgicas</h2>
                  <p className="text-slate-500 dark:text-slate-400">Mantenha seu repertório organizado.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white dark:bg-dark-surface text-blue-600 p-4 rounded-full shadow-lg hover:bg-blue-50 dark:hover:bg-dark-surface-hover transition-colors border border-blue-100 dark:border-dark-border"
                    title="Importar Música"
                  >
                    <Upload className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingCanto(null);
                      setIsCantoModalOpen(true);
                    }}
                    className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-dark-border transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Buscar por título ou letra..." 
                      value={searchCanto}
                      onChange={(e) => setSearchCanto(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all dark:text-white dark:placeholder:text-slate-600"
                    />
                  </div>
                  <select 
                    value={filterMoment}
                    onChange={(e) => setFilterMoment(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer dark:text-white"
                  >
                    <option value="todos">Todos os Momentos</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select 
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer dark:text-white"
                  >
                    <option value="todos">Todos os Anos</option>
                    <option value="A">Ano A</option>
                    <option value="B">Ano B</option>
                    <option value="C">Ano C</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCantos.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border">
                    <Music className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400 dark:text-slate-600 font-medium font-serif text-lg">Nenhuma música encontrada</p>
                  </div>
                ) : (
                  filteredCantos.map(canto => (
                    <div key={canto.id} className="group bg-white dark:bg-dark-surface p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-dark-border flex flex-col justify-between hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900 transition-all">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-wrap gap-2">
                             <span className="bg-blue-900 dark:bg-blue-800 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                               {canto.ano} | {canto.tipo}
                             </span>
                             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter text-white shadow-sm
                               ${temposLiturgicos.find(s => s.id === canto.season)?.color || 'bg-slate-400'}`}>
                               {canto.season}
                             </span>
                             {canto.tom && (
                               <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                                 TOM: {String(canto.tom).toUpperCase()}
                               </span>
                             )}
                             {canto.bpm && (
                               <span className="bg-slate-700 dark:bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                                 {canto.bpm} BPM
                               </span>
                             )}
                             {canto.compasso && (
                               <span className="bg-slate-500 dark:bg-slate-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                                 {canto.compasso}
                               </span>
                             )}
                          </div>
                          <div className="flex gap-1 text-slate-300 dark:text-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                exportCantoAsPDF(canto);
                              }}
                              className="p-2 hover:text-red-500 transition-colors"
                              title="Exportar PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                exportCantoAsJSON(canto);
                              }}
                              className="p-2 hover:text-purple-500 transition-colors"
                              title="Exportar JSON"
                            >
                              <FileJson className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCanto(canto);
                                setIsCantoModalOpen(true);
                              }}
                              className="p-2 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCanto(canto.id);
                              }}
                              className="p-2 hover:text-red-500 transition-colors"
                              title="Excluir Música"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-2xl leading-tight mb-3 font-serif">{canto.nome}</h4>
                        <p className="text-sm text-slate-400 dark:text-slate-500 line-clamp-3 mb-6 italic leading-relaxed">
                          {canto.letra}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setReadingCanto(canto);
                          setReadingAgenda(null); // Clear agenda if reading individual song
                          setKeyOffset(0); // Reset transpose when opening new song
                          setIsReadingModeOpen(true);
                        }}
                        className="w-full bg-blue-50 dark:bg-dark-bg text-blue-900 dark:text-blue-300 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-900 dark:hover:bg-blue-800 hover:text-white transition-all transform active:scale-95"
                      >
                        <BookOpen className="w-5 h-5" /> 
                        MODO LEITURA
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.section>
          )}

          {/* CONFIG SECTION */}
          {activeTab === 'config' && (
            <motion.section 
              key="config"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-serif font-bold text-blue-900 dark:text-blue-400">Configurações</h2>
                <p className="text-slate-500 dark:text-slate-400">Personalize a aparência e nomenclaturas do sistema.</p>
              </div>

              {/* THEME TOGGLE */}
              <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-dark-bg flex items-center justify-center text-slate-600 dark:text-slate-300">
                    {isDarkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Aparência do Sistema</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isDarkMode ? 'Modo Escuro Ativado' : 'Modo Claro Ativado'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-dark-border">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Outras Eventualidades</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  const formData = new FormData(e.currentTarget);
                  const nome = formData.get('nome') as string;
                  const desc = formData.get('descricao') as string;
                  if (nome) {
                    const novo = {
                      id: nome,
                      label: nome,
                      color: 'bg-slate-500',
                      borderColor: 'border-slate-500',
                      description: desc || 'Personalizado pelo usuário',
                      icon: 'music'
                    };
                    const updated = [...temposLiturgicos, novo];
                    try {
                      await updateDoc(doc(db, 'users', user.uid), { temposLiturgicos: updated });
                      showNotification(`Eventualidade "${nome}" adicionada.`, 'success');
                      e.currentTarget.reset();
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                    }
                  }
                }} className="space-y-4 mb-8 bg-slate-50 dark:bg-dark-bg p-6 rounded-2xl border border-slate-100 dark:border-dark-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      name="nome"
                      type="text" 
                      placeholder="Nome da eventualidade (ex: Hino de Padroeiros)" 
                      className="flex-1 p-4 border border-slate-200 dark:border-dark-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-bg dark:text-white"
                      required
                    />
                    <input 
                      name="descricao"
                      type="text" 
                      placeholder="Breve descrição" 
                      className="flex-1 p-4 border border-slate-200 dark:border-dark-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-bg dark:text-white"
                    />
                  </div>
                  <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Adicionar Eventualidade
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {temposLiturgicos.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-dark-bg p-4 rounded-2xl border border-slate-200 dark:border-dark-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${s.color} text-white rounded-xl flex items-center justify-center shadow-lg`}>
                          {getSeasonIcon(s.id)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-300 block">{s.label}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{s.description}</span>
                        </div>
                      </div>
                      {/* Original seasons cannot be deleted, so hide the button */}
                      {!INITIAL_SEASONS.find(orig => orig.id === s.id) && (
                        <button 
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!user) return;
                            const updated = temposLiturgicos.filter(x => x.id !== s.id);
                            try {
                              await updateDoc(doc(db, 'users', user.uid), { temposLiturgicos: updated });
                              showNotification(`Eventualidade "${s.label}" removida.`, 'info');
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                            }
                          }}
                          className="text-red-400 dark:text-red-900/60 hover:text-red-600 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="Excluir Eventualidade"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-dark-border">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Momentos da Missa</h3>
                <form onSubmit={handleAddCategory} className="flex gap-2 mb-8">
                  <input 
                    name="nova"
                    type="text" 
                    placeholder="Ex: Pós-Comunhão" 
                    className="flex-1 p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" className="bg-emerald-600 text-white px-8 rounded-2xl font-bold hover:bg-emerald-700 transition-colors">
                    Criar
                  </button>
                </form>
                
                <div className="flex flex-wrap gap-3">
                  {categorias.map(cat => (
                    <div key={cat} className="flex items-center gap-2 bg-slate-50 dark:bg-dark-bg px-4 py-2 rounded-xl border border-slate-200 dark:border-dark-border">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{cat}</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat);
                        }}
                        className="text-red-400 hover:text-red-600 font-bold p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-900 text-white p-8 rounded-3xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Backup de Dados</h3>
                    <p className="text-blue-200 text-sm">Seus dados são salvos automaticamente no navegador.</p>
                  </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 bg-blue-800 text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95 border border-blue-700"
                      >
                        <Upload className="w-5 h-5" />
                        IMPORTAR
                      </button>
                      <button 
                        onClick={handleExportData}
                        className="flex items-center justify-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-2xl font-black hover:bg-blue-50 transition-all active:scale-95"
                      >
                        <Download className="w-5 h-5" />
                        EXPORTAR
                      </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-800/50 rounded-2xl border border-blue-700/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Total de Músicas</p>
                    <p className="text-3xl font-bold">{cantos.length}</p>
                  </div>
                   <div className="p-4 bg-blue-800/50 rounded-2xl border border-blue-700/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Compromissos</p>
                    <p className="text-3xl font-bold">{agenda.length}</p>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* UNIFIED READING / FOLHETO MODE OVERLAY */}
      <AnimatePresence>
        {isReadingModeOpen && (readingCanto || (readingAgenda && readingAgenda.cantosIds)) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={setScrollElement}
            className="fixed inset-0 bg-white dark:bg-dark-bg z-[100] overflow-y-auto overflow-x-hidden selection:bg-blue-100 dark:selection:bg-blue-900/50"
          >
            {(() => {
              const currentCanto = activeReadingCanto;
                
              if (!currentCanto) {
                return (
                  <div className="p-20 text-center flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-dark-bg">
                    <div className="bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-dark-border max-w-sm">
                      <Music2 className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Música não encontrada</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6 font-serif">A música selecionada pode ter sido removida ou o ID é inválido.</p>
                      <button 
                        onClick={() => setIsReadingModeOpen(false)}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="w-full px-4 pr-16 sm:pr-8 sm:px-8 min-h-screen flex flex-col relative">
                  {/* Header Pillar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-8 border-b border-slate-200 dark:border-dark-border pb-8 sticky top-0 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md z-[130] -mx-4 sm:-mx-8 px-4 sm:px-8 pt-20 sm:pt-4">
                    <div className="flex-1 pr-4">
                      <div className="flex flex-wrap gap-2 items-center mb-3">
                        <span className={`text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tight shadow-sm ${readingAgenda ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                          {readingAgenda ? 'FOLHETO' : 'LEITURA'}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px] tracking-widest">{currentCanto.season}</span>
                        <span className="text-slate-300 dark:text-slate-700 font-light uppercase text-[10px]">|</span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">{currentCanto.tipo}</span>
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-serif font-black text-slate-900 dark:text-white leading-[1.1] mb-2 tracking-tight">
                        {currentCanto.nome}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {readingAgenda ? (
                          <>
                            <span className="text-blue-900 dark:text-blue-300">{readingAgenda.titulo}</span>
                            <span className="text-slate-200 dark:text-slate-800">•</span>
                            <span className="bg-slate-100 dark:bg-dark-surface px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400">Música {readingIndex + 1} de {readingAgenda.cantosIds!.length}</span>
                          </>
                        ) : (
                          <span>CIFRA INDIVIDUAL • REPERTÓRIO</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3 mt-6 sm:mt-0 flex-wrap sm:flex-nowrap items-center">
                      {currentCanto.bpm && (
                        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-2.5 rounded-2xl flex flex-col items-center shadow-xl border border-slate-800 dark:border-slate-800">
                          <span className="text-[9px] font-black opacity-50 uppercase tracking-tighter">BPM</span>
                          <span className="text-xl font-black tabular-nums">{currentCanto.bpm}</span>
                        </div>
                      )}
                      {currentCanto.compasso && (
                        <div className="bg-slate-600 dark:bg-slate-800 text-white px-5 py-2.5 rounded-2xl flex flex-col items-center shadow-xl border border-slate-500 dark:border-slate-700">
                          <span className="text-[9px] font-black opacity-50 uppercase tracking-tighter">COMPASSO</span>
                          <span className="text-xl font-black tracking-tight">{currentCanto.compasso}</span>
                        </div>
                      )}
                      <div className="bg-blue-600 dark:bg-blue-800 text-white px-5 py-2.5 rounded-2xl flex flex-col items-center shadow-xl border border-blue-500 dark:border-blue-700">
                        <span className="text-[9px] font-black opacity-50 uppercase tracking-tighter">ORIGINAL</span>
                        <span className="text-xl font-black">{currentCanto.tom || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* FIXED CLOSE BUTTON - Compact */}
                  <button 
                    onClick={() => setIsReadingModeOpen(false)}
                    className="fixed top-3 left-3 sm:top-4 sm:left-4 z-[200] bg-white dark:bg-dark-surface shadow-xl p-2 sm:p-2.5 rounded-full text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-dark-surface-hover hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-slate-200 dark:border-dark-border active:scale-90 flex items-center justify-center group"
                    title="Fechar"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                  
                  {/* Cifra Display Area */}
                  <div 
                    className="flex-1 whitespace-pre text-slate-800 dark:text-slate-200 pb-64 font-mono tracking-normal overflow-x-auto selection:bg-blue-100 dark:selection:bg-blue-900/40"
                    style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                  >
                    {/* Add extra padding at the top to start below the sticky header gap */}
                    <div className="pt-4 min-w-max px-4">
                      {/* Sub-label for key if transposed */}
                      {keyOffset !== 0 && (
                        <div className="mb-6 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800 text-sm font-bold text-blue-700 dark:text-blue-300">
                          <span>Tom atual:</span>
                          <span className="bg-white dark:bg-dark-surface px-2 py-0.5 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800">{currentKey}</span>
                        </div>
                      )}
                      {formattedLetra}
                    </div>
                  </div>

                  {/* Floating Action Center (Top Right) - Consolidated into 1st Menu */}
                  <div className="fixed right-1 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 sm:top-24 sm:translate-y-0 bottom-40 sm:bottom-32 flex flex-col items-end gap-2 sm:gap-4 z-[140]">
                    <button 
                      onClick={() => setShowFloatingMenu(!showFloatingMenu)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 pointer-events-auto border-2 ${
                        showFloatingMenu 
                          ? 'bg-red-500 border-red-400 text-white rotate-90' 
                          : 'bg-white border-blue-100 text-blue-600 dark:bg-dark-surface dark:border-dark-border dark:text-blue-400'
                      }`}
                    >
                      {showFloatingMenu ? <X className="w-8 h-8" /> : <Settings className="w-8 h-8" />}
                    </button>

                    <AnimatePresence>
                      {showFloatingMenu && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.9 }}
                          className="flex flex-col gap-2 sm:gap-3 pointer-events-auto max-h-[70vh] overflow-y-auto no-scrollbar py-2 sm:py-4 px-1"
                        >
                          {/* Auto-Scroll Controls */}
                          <div className="flex flex-col items-center bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl rounded-full p-1.5 border border-emerald-100 dark:border-emerald-900/50 shadow-xl">
                            <button 
                              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90
                                ${isAutoScrolling 
                                  ? 'bg-emerald-600 text-white animate-pulse' 
                                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
                              title={isAutoScrolling ? "Pausar Rolagem" : "Iniciar Rolagem"}
                            >
                              {isAutoScrolling ? <Pause className="w-5 h-5" strokeWidth={2.5} /> : <Play className="w-5 h-5 ml-0.5" strokeWidth={2.5} />}
                            </button>
                            <div className="mt-1.5 mb-1 flex flex-col items-center">
                              <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter opacity-70">VEL.</span>
                              <select 
                                value={scrollSpeed}
                                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                                className="bg-transparent text-[10px] font-black text-emerald-900 dark:text-emerald-100 outline-none text-center appearance-none cursor-pointer px-1"
                              >
                                {[0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 3].map(v => (
                                  <option key={v} value={v}>{v}x</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Transposition */}
                          <div className="flex flex-col items-center bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl rounded-[2rem] p-1.5 border border-blue-100 dark:border-blue-900/50 shadow-xl">
                            <button 
                              onClick={() => setKeyOffset(prev => prev + 1)}
                              className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-90"
                              title="Subir Tom"
                            >
                              <ArrowUp className="w-5 h-5" strokeWidth={3} />
                            </button>
                            
                            <div className="flex flex-col items-center py-2 px-0.5">
                              <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter mb-0.5">TOM</span>
                              <span className="text-sm font-black text-blue-900 dark:text-blue-100 tabular-nums">
                                {currentKey}
                              </span>
                            </div>

                            <button 
                              onClick={() => setKeyOffset(prev => prev - 1)}
                              className="w-11 h-11 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-all active:scale-90 shadow-sm mb-1.5"
                              title="Baixar Tom"
                            >
                              <ArrowDown className="w-5 h-5" strokeWidth={3} />
                            </button>

                            {keyOffset !== 0 && (
                              <div className="flex flex-col gap-1.5 border-t border-blue-50 dark:border-blue-900/50 pt-1.5 w-full items-center">
                                <button 
                                  onClick={() => setKeyOffset(0)}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-dark-bg transition-all"
                                  title="Original"
                                >
                                  <RefreshCcw className="w-4 h-4" />
                                </button>
                                
                                <button 
                                  onClick={async () => {
                                    if (!currentCanto) return;
                                    if (confirm(`Deseja salvar permanentemente no tom ${currentKey}?`)) {
                                      try {
                                        await updateDoc(doc(db, 'cantos', String(currentCanto.id)), {
                                          letra: transposedLetra,
                                          tom: currentKey,
                                          updatedAt: serverTimestamp()
                                        });
                                        setKeyOffset(0);
                                        showNotification('Salvo com sucesso!', 'success');
                                      } catch (err) {
                                        showNotification('Erro ao salvar.', 'error');
                                      }
                                    }
                                  }}
                                  className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm"
                                  title="Salvar Tom"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Zoom & Display */}
                          <div className="flex flex-col items-center bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl rounded-[2rem] p-2 border border-slate-100 dark:border-dark-border shadow-xl">
                            <button 
                              onClick={() => {
                                setEditingCanto(currentCanto);
                                setIsCantoModalOpen(true);
                              }}
                              className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-90 mb-2"
                              title="Editar"
                            >
                              <Edit className="w-5 h-5" />
                            </button>

                            <button 
                              onClick={() => currentCanto && exportCantoAsPDF(currentCanto, currentKey, transposedLetra || undefined)}
                              className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-90 mb-2"
                              title="PDF"
                            >
                              <FileText className="w-5 h-5" />
                            </button>

                            <button 
                              onClick={() => currentCanto && exportCantoAsJSON(currentCanto)}
                              className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all active:scale-90 mb-2"
                              title="JSON"
                            >
                              <FileJson className="w-5 h-5" />
                            </button>
                            
                            <div className="h-px w-8 bg-slate-100 dark:bg-dark-border mb-2" />
                            
                            <button 
                              onClick={() => setShowChords(!showChords)}
                              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border shadow-sm mb-2
                                ${!showChords ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                              title={showChords ? "Ocultar Cifras" : "Mostrar Cifras"}
                            >
                              <Music className="w-5 h-5" />
                            </button>
                            <div className="h-px w-8 bg-slate-100 mb-2" />
                            <button 
                              onClick={() => setFontSize(prev => Math.min(prev + 4, 60))}
                              className="w-12 h-12 flex items-center justify-center bg-white rounded-full text-slate-600 hover:bg-slate-50 transition-all active:scale-90 border border-slate-100 shadow-sm"
                              title="Aumentar Fonte"
                            >
                              <Maximize2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setFontSize(prev => Math.max(prev - 4, 12))}
                              className="w-12 h-12 flex items-center justify-center bg-white rounded-full text-slate-600 hover:bg-slate-50 transition-all active:scale-90 border border-slate-100 shadow-sm mt-2"
                              title="Diminuir Fonte"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Navigation Panel (Folheto Only) - Far Bottom Right */}
                  {readingAgenda && readingAgenda.cantosIds && (
                    <div className="fixed bottom-6 sm:bottom-10 right-4 sm:right-10 flex items-center gap-3 sm:gap-4 z-40 max-w-[calc(100vw-2rem)]">
                      {readingIndex > 0 && (
                        <button 
                          onClick={() => {
                            setReadingIndex(prev => prev - 1);
                            setKeyOffset(0);
                            setIsAutoScrolling(false);
                            if (activeScrollElement) activeScrollElement.scrollTop = 0;
                          }}
                          className="w-14 h-14 sm:w-20 sm:h-20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90"
                        >
                          <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
                        </button>
                      )}
                      
                      {readingIndex < readingAgenda.cantosIds.length - 1 ? (
                        <button 
                          onClick={() => {
                            setReadingIndex(prev => prev + 1);
                            setKeyOffset(0);
                            setIsAutoScrolling(false);
                            if (activeScrollElement) activeScrollElement.scrollTop = 0;
                          }}
                          className="bg-blue-600 shadow-[0_20px_50px_rgba(37,99,235,0.3)] h-14 sm:h-20 rounded-full flex items-center gap-2 sm:gap-4 text-white font-bold hover:bg-blue-700 hover:scale-105 transition-all active:scale-95 pl-6 pr-8 sm:pl-10 sm:pr-12 group"
                        >
                          <span className="text-lg sm:text-2xl font-black">Próxima</span>
                          <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setIsReadingModeOpen(false)}
                          className="bg-emerald-600 shadow-[0_20px_50px_rgba(5,150,105,0.3)] h-14 sm:h-20 rounded-full flex items-center gap-2 sm:gap-4 text-white font-bold hover:bg-emerald-700 hover:scale-105 transition-all active:scale-95 pl-6 pr-8 sm:pl-10 sm:pr-12"
                        >
                          <Church className="w-6 h-6 sm:w-8 sm:h-8" />
                          <span className="text-lg sm:text-2xl font-black">Concluir</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS AND PICKERS */}
      <AnimatePresence>
        {isAgendaModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[80] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-dark-surface rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-8 pb-4 border-b border-slate-50 dark:border-dark-border">
                <h3 className="text-2xl font-serif font-black text-blue-900 dark:text-blue-400">
                  {editingAgenda ? 'Editar Evento' : 'Novo Compromisso'}
                </h3>
              </div>

              <div className="p-8 py-6 overflow-y-auto flex-1 custom-scrollbar">
                <form id="agendaForm" onSubmit={handleSaveAgenda} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Título do Evento</label>
                    <input 
                      name="titulo"
                      defaultValue={editingAgenda?.titulo}
                      placeholder="Ex: Missa com Coroinhas" 
                      className="w-full border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium dark:text-white" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Local</label>
                    <input 
                      name="local"
                      defaultValue={editingAgenda?.local}
                      placeholder="Ex: Matriz" 
                      className="w-full border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium dark:text-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Data e Hora</label>
                    <input 
                      name="data"
                      type="datetime-local" 
                      defaultValue={editingAgenda?.data}
                      className="w-full border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium dark:text-white" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Recorrência</label>
                    <select 
                      name="recorrencia" 
                      defaultValue={editingAgenda?.recorrencia || 'unica'}
                      className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-dark-bg dark:text-white"
                    >
                      <option value="unica">Evento Único</option>
                      <option value="mensal">Repetir Mensalmente</option>
                      <option value="anual">Repetir Anualmente</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <input type="checkbox" name="syncGoogle" className="w-5 h-5 accent-blue-600" /> 
                    <span className="text-sm font-bold">Sincronizar Google Agenda</span>
                  </label>

                  {/* Song Selection for Playlist */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-dark-border">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Roteiro Musical</h4>
                      <button 
                        type="button"
                        onClick={() => setShowCantoPicker(true)}
                        className="text-[10px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline uppercase tracking-wider"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Música
                      </button>
                    </div>
                    
                    {selectedCantosForAgenda.length === 0 ? (
                      <div className="p-8 bg-slate-50 dark:bg-dark-bg border border-dashed border-slate-200 dark:border-dark-border rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Nenhuma música no roteiro</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedCantosForAgenda.map((id, index) => {
                          const canto = cantos.find(c => c.id === id);
                          if (!canto) return null;
                          return (
                            <div key={`${id}-${index}`} className="flex items-center justify-between p-3 bg-white dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 w-5 text-center">{index + 1}</span>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase leading-none mb-1">{canto.tipo}</span>
                                  <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{canto.nome}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="flex flex-col">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newIds = [...selectedCantosForAgenda];
                                      if (index > 0) {
                                        [newIds[index], newIds[index-1]] = [newIds[index-1], newIds[index]];
                                        setSelectedCantosForAgenda(newIds);
                                      }
                                    }}
                                    className="p-1 text-slate-300 dark:text-slate-700 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-30"
                                    disabled={index === 0}
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newIds = [...selectedCantosForAgenda];
                                      if (index < newIds.length - 1) {
                                        [newIds[index], newIds[index+1]] = [newIds[index+1], newIds[index]];
                                        setSelectedCantosForAgenda(newIds);
                                      }
                                    }}
                                    className="p-1 text-slate-300 dark:text-slate-700 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-30"
                                    disabled={index === selectedCantosForAgenda.length - 1}
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => setSelectedCantosForAgenda(prev => prev.filter((_, i) => i !== index))}
                                  className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-500 ml-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-50 dark:border-dark-border flex justify-end gap-3 bg-white dark:bg-dark-surface">
                <button 
                  type="button"
                  onClick={() => setIsAgendaModalOpen(false)} 
                  className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="agendaForm"
                  className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
                >
                  Salvar Evento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANTO PICKER MODAL (FOR AGENDA) */}
      <AnimatePresence>
        {showCantoPicker && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[80] backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="bg-white dark:bg-dark-surface rounded-[2rem] p-8 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-dark-border"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-serif font-black text-blue-900 dark:text-blue-400">Selecionar Música</h3>
                <button 
                  onClick={() => setShowCantoPicker(false)}
                  className="bg-slate-100 dark:bg-dark-bg p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-bg/60"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Pesquisar repertório..." 
                  value={searchCanto}
                  onChange={(e) => setSearchCanto(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {filteredCantos.length === 0 ? (
                  <div className="text-center py-10 opacity-40 dark:text-white">Nenhuma música encontrada</div>
                ) : (
                  filteredCantos.map(canto => (
                    <button 
                      key={canto.id}
                      onClick={() => {
                        setSelectedCantosForAgenda(prev => [...prev, canto.id]);
                        setShowCantoPicker(false);
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-white dark:bg-dark-bg border border-slate-100 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md transition-all flex justify-between items-center"
                    >
                      <div>
                        <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase block mb-0.5">{canto.tipo}</span>
                        <span className="font-bold text-slate-800 dark:text-white">{canto.nome}</span>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[10px] opacity-40 dark:opacity-60 dark:text-slate-300 uppercase">Ano {canto.ano}</span>
                          <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                          <span className="text-[10px] opacity-40 dark:opacity-60 dark:text-slate-300 uppercase">{canto.season}</span>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-blue-400 dark:text-blue-500" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANTO MODAL */}
      <AnimatePresence>
        {isCantoModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-surface rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-dark-border"
            >
              <h3 className="text-2xl font-serif font-bold mb-6 text-blue-900 dark:text-blue-400">
                {editingCanto ? 'Editar Música' : 'Adicionar Música'}
              </h3>
              <form onSubmit={handleSaveCanto} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Ano Litúrgico</label>
                    <select name="ano" defaultValue={editingCanto?.ano || 'Geral'} className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg dark:text-white outline-none">
                      <option value="A">Ano A</option>
                      <option value="B">Ano B</option>
                      <option value="C">Ano C</option>
                      <option value="Geral">Geral</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Tempo Litúrgico</label>
                    <select name="season" defaultValue={editingCanto?.season || selectedSeason || 'Geral'} className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg dark:text-white outline-none">
                      {temposLiturgicos.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Momento da Missa</label>
                  <select name="tipo" defaultValue={editingCanto?.tipo || categorias[0]} className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg dark:text-white outline-none font-bold">
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Título da Música</label>
                  <input 
                    name="nome"
                    defaultValue={editingCanto?.nome}
                    placeholder="Título da canção" 
                    className="w-full border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" 
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Tom Original</label>
                    <input 
                      name="tom" 
                      defaultValue={editingCanto?.tom || 'C'}
                      placeholder="C"
                      className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg dark:text-white outline-none font-bold uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">BPM</label>
                    <input 
                      name="bpm" 
                      type="number"
                      defaultValue={editingCanto?.bpm}
                      placeholder="120"
                      className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg dark:text-white outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Compasso</label>
                    <input 
                      name="compasso" 
                      defaultValue={editingCanto?.compasso}
                      placeholder="4/4"
                      className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg dark:text-white outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center pr-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Letra ou Cifra</label>
                    <button 
                      type="button" 
                      onClick={() => setIsLyricsFullScreen(true)}
                      className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <Maximize2 className="w-3 h-3" />
                      Tela Cheia
                    </button>
                  </div>
                  <textarea 
                    name="letra"
                    value={lyricsValue}
                    onChange={(e) => setLyricsValue(e.target.value)}
                    placeholder="Escreva a letra ou cole aqui..." 
                    className="w-full border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white p-4 rounded-2xl h-48 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsCantoModalOpen(false)} 
                    className="px-6 py-3 text-slate-400 dark:text-slate-500 font-bold hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-1 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN LYRICS EDITOR */}
      <AnimatePresence>
        {isLyricsFullScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white dark:bg-dark-bg z-[400] flex flex-col pt-safe"
          >
            <div className="w-full flex-1 flex flex-col h-full bg-white dark:bg-dark-bg">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-dark-border flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-500 uppercase leading-none mb-1">Editor em Tela Cheia</span>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-800 dark:text-white">Letra ou Cifra</h3>
                </div>
                <button 
                  onClick={() => setIsLyricsFullScreen(false)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  <Minimize2 className="w-5 h-5" />
                  CONCLUÍDO
                </button>
              </div>
              <div className="flex-1 p-4 sm:p-8 bg-slate-50/30 dark:bg-dark-surface/10 rounded-b-[2.5rem]">
                <textarea 
                  value={lyricsValue}
                  onChange={(e) => setLyricsValue(e.target.value)}
                  placeholder="Escreva a letra ou cole aqui..." 
                  className="w-full h-full border-none outline-none bg-transparent font-mono text-lg sm:text-xl text-slate-800 dark:text-white resize-none leading-relaxed"
                  autoFocus
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-8 sm:w-80 z-[300] p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100' :
              notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-100' :
              'bg-blue-50 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-100'
            } backdrop-blur-md`}
          >
            <div className={`p-2 rounded-full ${
              notification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-800/50' :
              notification.type === 'error' ? 'bg-red-100 dark:bg-red-800/50' :
              'bg-blue-100 dark:bg-blue-800/50'
            }`}>
              {notification.type === 'success' && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {notification.type === 'error' && <X className="w-5 h-5 text-red-600 dark:text-red-400" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="flex-1 text-sm font-bold leading-tight">
              {notification.message}
            </div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4 opacity-50" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImportData} 
        className="hidden" 
        accept="application/json,.json"
      />

    </div>
  );
}


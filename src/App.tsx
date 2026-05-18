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
import { Canto, AgendaItem, LiturgicalSeason, SeasonInfo } from './types';
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
import { onAuthStateChanged, User, signOut, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { Auth } from './components/Auth';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    document.title = "Gestão musical litúrgica";
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

  // Deep Linking Effect
  useEffect(() => {
    if (cantos.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const songId = params.get('reading');
      const offset = params.get('offset');
      
      if (songId) {
        const song = cantos.find(c => c.id === songId);
        if (song) {
          setReadingCanto(song);
          if (offset) {
            setKeyOffset(parseInt(offset, 10) || 0);
          }
          // Clear params from URL to avoid re-triggering and keeping it clean
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [cantos]);

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
  const [editingTempo, setEditingTempo] = useState<SeasonInfo | null>(null);
  
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
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.displayName || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);
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

  const transposeText = (text: string, offset: number, originalKeyHint?: string) => {
    if (offset === 0) return text;

    const notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    const map: Record<string, number> = {
      'C': 0, 'c': 0, 'C#': 1, 'c#': 1, 'Db': 1, 'db': 1, 'D': 2, 'd': 2, 'D#': 3, 'd#': 3, 'Eb': 3, 'eb': 3, 'E': 4, 'e': 4, 'F': 5, 'f': 5, 'F#': 6, 'f#': 6, 'Gb': 6, 'gb': 6, 'G': 7, 'g': 7, 'G#': 8, 'g#': 8, 'Ab': 8, 'ab': 8, 'A': 9, 'a': 9, 'A#': 10, 'a#': 10, 'Bb': 10, 'bb': 10, 'B': 11, 'b': 11
    };

    // Determine if we should prefer flats or sharps based on the target key
    const getPreference = (origKey: string | undefined, off: number) => {
      if (!origKey) return 'sharp';
      const cleanKey = origKey.match(/^[A-G][#b]?/i)?.[0] || 'C';
      const rootIdx = map[cleanKey];
      if (rootIdx === undefined) return 'sharp';
      const targetIdx = (rootIdx + off + 12) % 12;
      
      // Keys that typically prefer flats: F (5), Bb (10), Eb (3), Ab (8), Db (1), Gb (6)
      const flatPreferringIndices = [5, 10, 3, 8, 1, 6];
      return flatPreferringIndices.includes(targetIdx) ? 'flat' : 'sharp';
    };

    const preference = getPreference(originalKeyHint, offset);
    const targetNotes = preference === 'flat' ? notesFlat : notesSharp;

    const chordRegex = /(?<![a-zA-ZÀ-ÿ])[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?(?:\/[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?)?(?![a-zA-ZÀ-ÿ])|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$)/g;

    const lines = text.split('\n');
    const transposedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return line;

      // Heuristic to detect if it's a dedicated chord/notation line
      const commonWords = /\b(a|o|e|é|do|da|de|que|com|se|um|em|os|as|paz|meu|teu|sua|seu)\b/i;
      const hasCommonWords = commonWords.test(trimmedLine);
      const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
      const chordOrNotationTokens = tokens.filter(t => {
        const m = t.match(chordRegex);
        return m && m[0] === t;
      });
      const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
      
      const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t.replace(/[.,!?;:]/g, '')));
      const chordRatio = tokens.length > 0 ? (chordOrNotationTokens.length / tokens.length) : 0;
      
      const isActuallyChordLine = tokens.length > 0 && (
        chordRatio >= 0.7 || 
        (chordOrNotationTokens.length > 0 && !hasLongLyrics && !hasCommonWords)
      );

      // Regra: se não for linha de cifra, não transpõe nada (preserva letra)
      if (!isActuallyChordLine) {
        return line;
      }

      let resultLine = "";
      let lastIndex = 0;

      const matches = Array.from(line.matchAll(chordRegex));
      
      for (const match of matches) {
        const fullMatch = match[0];
        const matchIndex = match.index!;
        
        const prefix = line.substring(lastIndex, matchIndex);
        resultLine += prefix;

        // Regra 1: Identificar e separar acordes aglutinados (ex: C#mF#m -> C#m F#m)
        if (lastIndex === matchIndex && resultLine.length > 0 && isActuallyChordLine && /^[a-gA-G]/i.test(fullMatch)) {
          resultLine += ' ';
        }

        // If it's not a chord (just notation), keep it
        if (!/^[A-G]/i.test(fullMatch)) {
          resultLine += fullMatch;
          lastIndex = matchIndex + fullMatch.length;
          continue;
        }

        // Transpose the chord
        const transposeChordPart = (chord: string) => {
          const rootMatch = chord.match(/^[A-G][#b]?/i);
          if (!rootMatch) return chord;
          const root = rootMatch[0];
          const rest = chord.slice(root.length);
          let rootIndex = map[root];
          if (rootIndex === undefined) return chord;
          let newIndex = (rootIndex + offset + 12) % 12;
          return targetNotes[newIndex] + rest;
        };

        const parts = fullMatch.split('/');
        let transposed = transposeChordPart(parts[0]);
        if (parts[1]) transposed += '/' + transposeChordPart(parts[1]);

        resultLine += transposed;
        lastIndex = matchIndex + fullMatch.length;

        // Alignment logic
        if (isActuallyChordLine) {
          const delta = transposed.length - fullMatch.length;
          if (delta > 0) {
            let spacesToConsume = delta;
            while (spacesToConsume > 0 && lastIndex < line.length && line[lastIndex] === ' ') {
              lastIndex++;
              spacesToConsume--;
            }
          } else if (delta < 0) {
            resultLine += ' '.repeat(Math.abs(delta));
          }
        }
      }

      resultLine += line.substring(lastIndex);
      return resultLine;
    });

    return transposedLines.join('\n');
  };

  const transposedLetra = useMemo(() => {
    if (!activeReadingCanto) return '';
    return transposeText(activeReadingCanto.letra, keyOffset, activeReadingCanto.tom);
  }, [activeReadingCanto, keyOffset]);

  const formattedLetra = useMemo(() => {
    if (!transposedLetra) return null;
    
    // Synchronized Chord and Notation Regex with transposition logic
    const chordRegex = /(?<![a-zA-ZÀ-ÿ])[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?(?:\/[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?)?(?![a-zA-ZÀ-ÿ])|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$)/g;
    
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
            className="text-slate-900 dark:text-white font-bold text-base sm:text-lg mt-6 mb-3 sm:mt-10 sm:mb-5 flex items-center gap-2 sm:gap-3 border-b border-slate-100 dark:border-dark-border pb-2 outline-none"
          >
            <span className="text-blue-500">#</span>
            {headerText}
          </div>
        );
      }

      // Heuristic: High chord/notation density, or no long words typically found in lyrics
      const commonWords = /\b(a|o|e|é|do|da|de|que|com|se|um|em|os|as|paz|meu|teu|sua|seu)\b/i;
      const hasCommonWords = commonWords.test(trimmedLine);
      const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
      const chordOrNotationTokens = tokens.filter(t => {
        const m = t.match(chordRegex);
        return m && m[0] === t;
      });
      const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
      
      const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t.replace(/[.,!?;:]/g, '')));
      const chordRatio = tokens.length > 0 ? (chordOrNotationTokens.length / tokens.length) : 0;
      const isActuallyChordLine = tokens.length > 0 && (
        (chordRatio >= 0.7) || 
        (chordOrNotationTokens.length > 0 && !hasLongLyrics && !hasCommonWords)
      );

      const splitRegex = /((?<![a-zA-ZÀ-ÿ])[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?(?:\/[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?)?(?![a-zA-ZÀ-ÿ])|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$))/g;
      const parts = line.split(splitRegex);

      return (
        <div 
          key={`line-${lineIdx}`} 
          className={`min-h-[1.1em] relative transition-colors ${isActuallyChordLine ? 'mb-1 opacity-100' : 'mb-3 sm:mb-6'}`}
        >
          {parts.map((part, i) => {
            const isMatch = part && part.match(chordRegex);
            
            // False positive prevention:
            // In lyrics lines, we avoid highlighting single-letter matches that are common articles/words.
            const isSingleLetterChord = part && part.length === 1 && /^[A-G]$/i.test(part);
            const shouldExcludeSingleLetter = isSingleLetterChord && !isActuallyChordLine;
            const shouldHighlight = isMatch && !shouldExcludeSingleLetter;

            if (shouldHighlight) {
              if (!showChords) return null;
              
              const hasDrawingChars = /[~^┌┐─│└┘]/.test(part);

              return (
                <span
                  key={i}
                  className="font-mono transition-all inline-block select-none text-blue-800 dark:text-blue-300 font-bold relative"
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
                className={`${trimmedLine === '' ? '' : 'text-black dark:text-white font-bold'}`}
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
  const [filterSeason, setFilterSeason] = useState('todos');

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
    if (keyOffset === 0) return String(canto.tom);

    const notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    // Determine preference based on target index
    const cleanKey = canto.tom.match(/^[A-G][#b]?/i)?.[0] || 'C';
    const rootIdx = NOTE_MAP[cleanKey];
    if (rootIdx === undefined) return canto.tom;
    
    const targetIdx = (rootIdx + keyOffset + 12) % 12;
    const flatPreferringIndices = [1, 3, 5, 6, 8, 10]; // Db, Eb, F, Gb, Ab, Bb
    const targetNotes = flatPreferringIndices.includes(targetIdx) ? notesFlat : notesSharp;

    const transposeChordPart = (chord: string, offset: number) => {
      const rootMatch = chord.match(/^[A-G][#b]?/i);
      if (!rootMatch) return chord;
      const root = rootMatch[0].toUpperCase();
      const rest = chord.slice(root.length);
      
      let rootIndex = NOTE_MAP[root];
      if (rootIndex === undefined) return chord;

      let newIndex = (rootIndex + offset) % 12;
      if (newIndex < 0) newIndex += 12;

      return targetNotes[newIndex] + rest;
    };

    return String(transposeChordPart(canto.tom, keyOffset));
  }, [readingCanto?.tom, keyOffset, readingAgenda, readingIndex, cantos]);

  const handleShare = async () => {
    if (!activeReadingCanto) return;
    
    // Create sharing URL
    const url = new URL(window.location.origin);
    url.searchParams.set('reading', activeReadingCanto.id.toString());
    if (keyOffset !== 0) {
      url.searchParams.set('offset', keyOffset.toString());
    }

    const shareData = {
      title: `${activeReadingCanto.nome} - Tom: ${currentKey}`,
      text: `Confira a cifra de "${activeReadingCanto.nome}" no tom ${currentKey} na Gestão Musical Litúrgica.`,
      url: url.toString()
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url.toString());
        showNotification('Link copiado para a área de transferência!', 'success');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        showNotification('Erro ao compartilhar.', 'error');
      }
    }
  };

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
      const matchesSeason = filterSeason === 'todos' || c.season === filterSeason;
      return matchesSearch && matchesMoment && matchesYear && matchesSeason;
    });
  }, [cantos, debouncedSearch, filterMoment, filterYear, filterSeason]);

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

      const chordRegex = /(?<![a-zA-ZÀ-ÿ])[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?(?:\/[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?)?(?![a-zA-ZÀ-ÿ])|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$)/g;
      const sectionRegex = /^(\[|\()(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estribilho|ponte|coda|inst|inter|fim|pre-refrão|parte|estrofe)(.*)(\]|\))$/i;

      // Mantém caracteres musicais originais para maior fidelidade
      const ensurePdfSafeChars = (text: string) => {
        return text;
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
            // Smooth vector curve for musical tie
            const startX = currX + (0.1 * cW);
            const endX = currX + cW - (0.1 * cW);
            const baseLineY = bottomY - (0.2 * scale);
            const apexY = topY - (1.3 * scale);
            doc.setLineWidth(0.4 * scale);
            doc.lines([[ (midX - startX), (apexY - baseLineY), (endX - midX), (baseLineY - apexY) ]], startX, baseLineY, [1, 1], 'D');
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

          const commonWords = /\b(a|o|e|é|do|da|de|que|com|se|um|em|os|as|paz|meu|teu|sua|seu)\b/i;
          const hasCommonWords = commonWords.test(trimmedLine);
          const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
          const chordOrNotationTokens = tokens.filter(t => {
            const m = t.match(chordRegex);
            return m && m[0] === t;
          });
          const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
          const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t.replace(/[.,!?;:]/g, '')));
          const isChordLine = tokens.length > 0 && (
            (chordOrNotationTokens.length / tokens.length >= 0.7) || 
            (chordOrNotationTokens.length > 0 && !hasLongLyrics && !hasCommonWords)
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

      const chordRegex = /(?<![a-zA-ZÀ-ÿ])[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?(?:\/[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?)?(?![a-zA-ZÀ-ÿ])|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$)/g;
      const sectionRegex = /^(\[|\()(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estribilho|ponte|coda|inst|inter|fim|pre-refrão|parte|estrofe)(.*)(\]|\))$/i;

      // Mantém caracteres musicais originais para maior fidelidade
      const ensurePdfSafeChars = (text: string) => {
        return text;
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

            const commonWords = /\b(a|o|e|é|do|da|de|que|com|se|um|em|os|as|paz|meu|teu|sua|seu)\b/i;
            const hasCommonWords = commonWords.test(trimmedLine);
            const tokens = trimmedLine.split(/\s+/).filter(t => t.length > 0);
            const chordOrNotationTokens = tokens.filter(t => {
              const m = t.match(chordRegex);
              return m && m[0] === t;
            });
            const nonChordTokens = tokens.filter(t => !chordOrNotationTokens.includes(t));
            const hasLongLyrics = nonChordTokens.some(t => t.length > 3 && /^[a-zÀ-ÿ]+$/i.test(t.replace(/[.,!?;:]/g, '')));
            const isChordLine = tokens.length > 0 && (
              (chordOrNotationTokens.length / tokens.length >= 0.7) || 
              (chordOrNotationTokens.length > 0 && !hasLongLyrics && !hasCommonWords)
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
        <p className="text-slate-500 font-bold font-serif">Iniciando Gestão musical litúrgica...</p>
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
            <h1 className="text-4xl font-serif font-black mb-3 leading-tight tracking-tight">Gestão musical litúrgica</h1>
            <p className="text-blue-200 font-medium">Plataforma profissional para organização de repertórios, cifras e escalas litúrgicas.</p>
          </div>
          <Auth />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-dark-bg min-h-screen text-slate-900 dark:text-dark-text font-sans pb-32 transition-colors duration-500 relative overflow-x-hidden">
      {/* 3D Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/20 dark:bg-emerald-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-400/10 dark:bg-purple-600/5 blur-[100px] rounded-full animate-pulse [animation-delay:4s]" />
      </div>

      {/* Navbar - Floating Glassmorphic */}
      <nav className="fixed top-4 left-4 right-4 z-[60] px-4">
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="container mx-auto px-6 py-4 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 dark:border-white/5 flex justify-between items-center"
        >
          <h1 className="text-xl font-bold flex items-center tracking-tight gap-3 text-blue-900 dark:text-blue-400">
            <div className="p-2 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30">
              <Church className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">Gestão musical</span>
              <span className="font-serif italic font-black text-lg leading-tight">litúrgica</span>
            </div>
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Bem-vindo</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">{user.displayName || user.email?.split('@')[0]}</span>
            </div>
            <button 
              onClick={() => {
                if (confirm('Deseja realmente sair?')) {
                  signOut(auth);
                }
              }}
              className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Tabs - Floating Dock Style at the bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-fit max-w-[95vw]">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="flex items-center gap-2 p-3 bg-white/40 dark:bg-dark-surface/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 preserve-3d"
        >
          {[
            { id: 'tempos', icon: <Calendar className="w-6 h-6" />, label: 'Calendário' },
            { id: 'agenda', icon: <Clock className="w-6 h-6" />, label: 'Agenda' },
            { id: 'cantos', icon: <Music className="w-6 h-6" />, label: 'Músicas' },
            { id: 'config', icon: <Settings className="w-6 h-6" />, label: 'Ajustes' },
          ].map(tab => (
            <motion.button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ y: -10, scale: 1.1, translateZ: 20 }}
              whileTap={{ scale: 0.9 }}
              className={`relative flex flex-col items-center justify-center p-4 rounded-[2rem] transition-all min-w-[70px] sm:min-w-[90px]
                ${activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-[0_15px_30px_rgba(37,99,235,0.4)]' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10'}`}
            >
              {tab.icon}
              <span className="text-[10px] font-black uppercase mt-1 hidden sm:block">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute -inset-1 blur-xl bg-blue-500/20 -z-10"
                />
              )}
            </motion.button>
          ))}
        </motion.div>
      </div>

      <main className="container mx-auto px-4 pt-32 pb-24 relative z-10">
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="space-y-1">
                  <h2 className="text-4xl font-serif font-black text-blue-900 dark:text-blue-400 tracking-tight">Ciclos Litúrgicos</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Explore o calendário e prepare suas celebrações.</p>
                </div>
                <div className="h-1 w-20 bg-blue-600 rounded-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 perspective-2000">
                {temposLiturgicos.map((season, index) => (
                  <motion.button
                    key={season.id}
                    initial={{ opacity: 0, scale: 0.9, rotateY: index % 2 === 0 ? 10 : -10 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -15, 
                      rotateX: 5,
                      rotateY: -5,
                      z: 50,
                      boxShadow: "0 40px 80px -20px rgba(0,0,0,0.2)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => setSelectedSeason(selectedSeason === season.id ? null : season.id)}
                    className={`relative overflow-hidden bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl p-8 rounded-[3rem] border-t-2 border-white/50 dark:border-white/5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] text-left transition-all preserve-3d group
                      ${selectedSeason === season.id ? 'ring-4 ring-blue-500/20 border-blue-500' : ''}`}
                  >
                    {/* Interior depth effect */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transform transition-transform group-hover:scale-110 group-hover:rotate-6 ${season.color} shadow-${season.borderColor.split('-')[1]}/30`}>
                        {getSeasonIcon(season.id)}
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-dark-bg rounded-2xl text-slate-300 dark:text-slate-600">
                        <ChevronRight className={`w-6 h-6 transition-transform duration-500 ${selectedSeason === season.id ? 'rotate-90 text-blue-500' : ''}`} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-3">{season.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed opacity-80">{season.description}</p>
                    
                    {/* Bottom accent */}
                    <div className={`absolute bottom-0 left-0 right-0 h-2 opacity-50 ${season.color}`} />
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
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h2 className="text-4xl font-serif font-black text-blue-900 dark:text-blue-400 tracking-tight">Próximos Eventos</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Sua jornada litúrgica em um só lugar.</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setEditingAgenda(null);
                    setIsAgendaModalOpen(true);
                  }}
                  className="bg-blue-600 text-white p-5 rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-8 h-8" />
                </motion.button>
              </div>

              {upcomingEvents.length > 0 && (
                <div className="space-y-6 mb-16">
                  <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="w-8 h-px bg-blue-600/30" />
                    STATUS: ATIVO
                  </h3>
                  <div className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 scrollbar-hide perspective-2000">
                    {upcomingEvents.map((item, index) => (
                      <motion.div 
                        key={`upcoming-${item.id}`}
                        initial={{ opacity: 0, x: 50, rotateY: 20 }}
                        animate={{ opacity: 1, x: 0, rotateY: 0 }}
                        whileHover={{ 
                          y: -20, 
                          rotateX: 5,
                          rotateY: -5,
                          z: 100,
                          scale: 1.05
                        }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 25 }}
                        onClick={() => {
                          setEditingAgenda(item);
                          setIsAgendaModalOpen(true);
                        }}
                        className="min-w-[320px] bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-8 rounded-[3rem] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)] cursor-pointer relative overflow-hidden group preserve-3d"
                      >
                        {/* 3D Reflection Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="absolute top-[-20%] right-[-10%] opacity-10 blur-2xl group-hover:scale-125 transition-transform duration-700">
                          <Calendar className="w-48 h-48" />
                        </div>

                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-6">
                            <span className="bg-white/10 backdrop-blur-md text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter border border-white/10">
                              {new Date(item.data).toLocaleDateString('pt-BR', { weekday: 'long' })}
                            </span>
                            {item.recorrencia && item.recorrencia !== 'unica' && (
                              <div className="bg-blue-400/20 p-2 rounded-xl backdrop-blur-xl border border-white/10 shadow-lg">
                                <RefreshCcw className="w-4 h-4 text-blue-200" />
                              </div>
                            )}
                          </div>

                          <h4 className="font-serif font-black text-2xl leading-tight mb-8 line-clamp-2 min-h-[3.5rem] tracking-tight group-hover:text-blue-200 transition-colors">{item.titulo}</h4>
                          
                          <div className="space-y-4">
                            <div className="flex items-center text-sm font-black bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl w-fit border border-white/5">
                              <Clock className="w-4 h-4 mr-2 text-blue-300" />
                              {new Date(item.data).toLocaleTimeString('pt-BR', { timeStyle: 'short' })}
                            </div>
                            <div className="flex items-center text-[11px] font-bold opacity-60">
                              <MapPin className="w-4 h-4 mr-2 text-indigo-400" />
                              {item.local || 'Santuário Matriz'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="w-8 h-px bg-slate-300 dark:bg-slate-800" />
                    HISTÓRICO COMPLETO
                  </h3>
                  {agenda.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 backdrop-blur-xl rounded-[3rem] border border-dashed border-slate-200 dark:border-dark-border">
                      <Calendar className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-400 dark:text-slate-600 font-black font-serif text-lg">Sua agenda está vazia</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {agenda.map(originalItem => {
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
                          <motion.div 
                            key={item.id} 
                            whileHover={{ scale: 1.02, x: 10, translateZ: 10 }}
                            className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl p-6 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-white dark:border-white/5 hover:shadow-2xl transition-all group"
                          >
                            <div 
                              className="cursor-pointer flex-1 w-full"
                              onClick={() => {
                                setEditingAgenda(originalItem);
                                setSelectedCantosForAgenda(originalItem.cantosIds || []);
                                setIsAgendaModalOpen(true);
                              }}
                            >
                              <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h4 className="font-serif font-black text-2xl text-slate-900 dark:text-white leading-none group-hover:text-blue-600 transition-colors uppercase italic">{item.titulo}</h4>
                                {originalItem.recorrencia && originalItem.recorrencia !== 'unica' && (
                                  <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-2 shadow-lg shadow-blue-600/20">
                                    <RefreshCcw className="w-3 h-3" />
                                    {originalItem.recorrencia === 'mensal' ? 'Mensal' : 'Anual'}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 mt-4">
                                <div className="flex items-center text-[10px] text-blue-600 dark:text-blue-400 font-black bg-blue-50 dark:bg-blue-900/40 px-4 py-1.5 rounded-full border border-blue-100 dark:border-blue-900 shadow-inner">
                                  <MapPin className="w-3.5 h-3.5 mr-2" />
                                  {item.local || 'Paróquia'}
                                </div>
                                <div className="flex items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-dark-bg px-4 py-1.5 rounded-full shadow-inner">
                                  <Clock className="w-3.5 h-3.5 mr-2" />
                                  {isValidDate ? eventDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data inválida'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mt-6 sm:mt-0 w-full sm:w-auto">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportFolhetoAsPDF(item);
                                }}
                                className={`flex-1 sm:flex-none p-4 rounded-2xl transition-all shadow-sm ${item.cantosIds?.length ? 'bg-blue-600 text-white hover:scale-110' : 'bg-slate-100 text-slate-300 dark:bg-slate-800'}`}
                                title="Download"
                                disabled={!item.cantosIds?.length}
                              >
                                <Download className="w-5 h-5 mx-auto" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.cantosIds && item.cantosIds.length > 0) {
                                    setReadingAgenda(item);
                                    setReadingIndex(0);
                                    setReadingCanto(null);
                                    setKeyOffset(0);
                                    setIsReadingModeOpen(true);
                                  }
                                }}
                                className={`flex-1 sm:flex-none p-4 rounded-2xl transition-all shadow-sm ${item.cantosIds?.length ? 'bg-emerald-600 text-white hover:scale-110' : 'bg-slate-100 text-slate-300 dark:bg-slate-800'}`}
                                title="Abrir"
                                disabled={!item.cantosIds?.length}
                              >
                                <BookOpen className="w-5 h-5 mx-auto" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAgenda(item.id);
                                }}
                                className="flex-1 sm:flex-none p-4 bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all hover:scale-110 shadow-sm"
                                title="Excluir"
                              >
                                <Trash2 className="w-5 h-5 mx-auto" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 px-2">
                <div className="space-y-1">
                  <h2 className="text-4xl font-serif font-black text-blue-900 dark:text-blue-400 tracking-tight">Repertório Musical</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium font-serif italic text-lg opacity-80">Harmonia para cada momento.</p>
                </div>
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: -5, z: 20 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/80 dark:bg-dark-surface/80 text-blue-600 p-5 rounded-[2rem] shadow-xl hover:bg-blue-50 dark:hover:bg-dark-surface-hover transition-all border border-blue-100 dark:border-dark-border"
                    title="Importar Música"
                  >
                    <Upload className="w-8 h-8" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 5, z: 20 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setEditingCanto(null);
                      setIsCantoModalOpen(true);
                    }}
                    className="bg-blue-600 text-white p-5 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all border-t-2 border-white/20"
                  >
                    <Plus className="w-8 h-8" />
                  </motion.button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-2xl p-8 rounded-[3rem] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] border border-white dark:border-white/5 transition-all mb-10 translate-z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Buscar por título ou letra..." 
                      value={searchCanto}
                      onChange={(e) => setSearchCanto(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all dark:text-white dark:placeholder:text-slate-600 shadow-inner"
                    />
                  </div>
                  <select 
                    value={filterMoment}
                    onChange={(e) => setFilterMoment(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm cursor-pointer dark:text-white shadow-inner appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTkgOWwtNyA3LTctNyIvPjwvc3ZnPg==')] bg-[length:20px] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="todos">Todos os Momentos</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select 
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm cursor-pointer dark:text-white shadow-inner appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTkgOWwtNyA3LTctNyIvPjwvc3ZnPg==')] bg-[length:20px] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="todos">Todos os Anos</option>
                    <option value="A">Ano A</option>
                    <option value="B">Ano B</option>
                    <option value="C">Ano C</option>
                    <option value="Geral">Geral</option>
                  </select>
                  <select 
                    value={filterSeason}
                    onChange={(e) => setFilterSeason(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm cursor-pointer dark:text-white shadow-inner appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTkgOWwtNyA3LTctNyIvPjwvc3ZnPg==')] bg-[length:20px] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="todos">Todos os Tempos</option>
                    {temposLiturgicos.map(season => (
                      <option key={season.id} value={season.id}>{season.label}</option>
                    ))}
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
                  filteredCantos.map((canto, index) => (
                    <motion.div 
                      key={canto.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ 
                        scale: 1.02, 
                        y: -10,
                        rotateX: 2,
                        rotateY: -2,
                        z: 20
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 25,
                        delay: index * 0.05 
                      }}
                      className="group bg-white dark:bg-dark-surface p-8 rounded-[3rem] shadow-[0_15px_40px_-20px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-dark-border flex flex-col justify-between hover:shadow-[0_30px_70px_-15px_rgba(37,99,235,0.25)] dark:hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.6)] transition-all cursor-pointer relative overflow-hidden h-full preserve-3d"
                      onClick={() => {
                        setReadingCanto(canto);
                        setReadingAgenda(null);
                        setKeyOffset(0);
                        setIsReadingModeOpen(true);
                      }}
                    >
                      {/* Depth Shine */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-wrap gap-2">
                             <span className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-md">
                               {canto.ano} | {canto.tipo}
                             </span>
                             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter text-white shadow-md
                               ${temposLiturgicos.find(s => s.id === canto.season)?.color || 'bg-slate-400'}`}>
                               {canto.season}
                             </span>
                             {canto.tom && (
                               <span className="bg-amber-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-md">
                                 TOM: {String(canto.tom)}
                               </span>
                             )}
                          </div>
                          <div className="flex gap-1 text-slate-300 dark:text-slate-600">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 exportCantoAsPDF(canto);
                               }}
                               className="p-2 hover:text-red-500 transition-all hover:scale-125"
                               title="PDF"
                             >
                               <FileText className="w-5 h-5" />
                             </button>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteCanto(canto.id);
                               }}
                               className="p-2 hover:text-red-600 transition-all hover:scale-125"
                               title="Excluir"
                             >
                               <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                        
                        <h4 className="font-bold text-slate-800 dark:text-white text-2xl leading-tight mb-4 font-serif group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">{canto.nome}</h4>
                        
                        <p className="text-sm text-slate-400 dark:text-slate-500 line-clamp-3 mb-8 italic leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                          {canto.letra}
                        </p>

                        <div className="mt-auto pt-6 border-t border-slate-50 dark:border-white/5 flex justify-between items-center">
                          <div className="flex gap-4">
                            {canto.bpm && (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Ritmo</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  {canto.bpm} BPM
                                </span>
                              </div>
                            )}
                            {canto.compasso && (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Compasso</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  {canto.compasso}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 shadow-inner group-hover:shadow-[0_10px_25px_rgba(37,99,235,0.4)] translate-z-20">
                            <ChevronRight className="w-7 h-7" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
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
              <div className="flex flex-col gap-2 mb-10 px-2">
                <h2 className="text-4xl font-serif font-black text-blue-900 dark:text-blue-400 tracking-tight">Configurações</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Personalize sua experiência digital.</p>
              </div>

              {/* PERFIL - 3D Card */}
              <motion.div 
                whileHover={{ y: -5, translateZ: 20 }}
                className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white dark:border-white/5 group preserve-3d"
              >
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 shadow-inner">
                    <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Meu Perfil</h4>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Atualize seus dados pessoais</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Nome Completo</label>
                      <input 
                        type="text" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Seu nome" 
                        className="w-full p-5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">E-mail</label>
                      <input 
                        type="email" 
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="seu@email.com" 
                        className="w-full p-5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Nova Senha (deixe em branco para manter)</label>
                    <input 
                      type="password" 
                      value={profileNewPassword}
                      onChange={(e) => setProfileNewPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full p-5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm dark:text-white"
                    />
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isUpdatingProfile}
                    onClick={async () => {
                      if (!user) return;
                      setIsUpdatingProfile(true);
                      try {
                        // Name update
                        if (profileName !== user.displayName) {
                          await updateProfile(user, { displayName: profileName });
                        }
                        
                        // Email update
                        if (profileEmail !== user.email && profileEmail) {
                          await updateEmail(user, profileEmail);
                        }
                        
                        // Password update
                        if (profileNewPassword) {
                          await updatePassword(user, profileNewPassword);
                          setProfileNewPassword('');
                        }
                        
                        showNotification('Perfil atualizado com sucesso!', 'success');
                      } catch (err: any) {
                        if (err.code === 'auth/requires-recent-login') {
                          showNotification('Para alterar e-mail ou senha, você precisa ter feito login recentemente. Por favor, saia e entre novamente.', 'error');
                        } else {
                          showNotification(`Erro: ${err.message}`, 'error');
                        }
                      } finally {
                        setIsUpdatingProfile(false);
                      }
                    }}
                    className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                  >
                    {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isUpdatingProfile ? 'Atualizando...' : 'Salvar Alterações do Perfil'}
                  </motion.button>
                </div>
              </motion.div>

              {/* THEME TOGGLE - 3D Card */}
              <motion.div 
                whileHover={{ y: -5, translateZ: 20 }}
                className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white dark:border-white/5 flex items-center justify-between group preserve-3d"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-[1.5rem] ${isDarkMode ? 'bg-indigo-950' : 'bg-amber-100'} flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 shadow-inner`}>
                    {isDarkMode ? <Moon className="w-8 h-8 text-indigo-400" /> : <Sun className="w-8 h-8 text-amber-600" />}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Aparência</h4>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1 italic">
                      {isDarkMode ? 'MODO NOTURNO ATIVO' : 'MODO DIURNO ATIVO'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-20 h-10 rounded-full p-1.5 transition-all duration-500 relative flex items-center ${isDarkMode ? 'bg-blue-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' : 'bg-slate-200 shadow-inner'}`}
                >
                  <motion.div 
                    animate={{ x: isDarkMode ? 40 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-7 h-7 bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.2)]" 
                  />
                </button>
              </motion.div>

              <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl p-10 rounded-[4rem] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.1)] border border-white dark:border-white/5">
                <div className="flex items-center gap-3 mb-8">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-none">Eventualidades</h3>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                </div>
                <form id="tempoForm" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const nome = formData.get('nome') as string;
                  const desc = formData.get('descricao') as string;
                  if (nome) {
                    let updated: SeasonInfo[];
                    if (editingTempo) {
                      updated = temposLiturgicos.map(t => 
                        t.id === editingTempo.id 
                          ? { ...t, label: nome, description: desc || 'Personalizado pelo usuário' } 
                          : t
                      );
                    } else {
                      const novo: SeasonInfo = {
                        id: `custom-${Date.now()}`,
                        label: nome,
                        color: 'bg-slate-500',
                        borderColor: 'border-slate-500',
                        description: desc || 'Personalizado pelo usuário',
                        icon: 'music'
                      };
                      updated = [...temposLiturgicos, novo];
                    }
                    
                    try {
                      await updateDoc(doc(db, 'users', user.uid), { temposLiturgicos: updated });
                      showNotification(editingTempo ? `Registro "${nome}" atualizado.` : `Registro "${nome}" adicionado.`, 'success');
                      setEditingTempo(null);
                      if (form) form.reset();
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                    }
                  }
                }} className="space-y-6 mb-12 bg-slate-50/50 dark:bg-dark-bg/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-inner" key={editingTempo?.id || 'new-tempo'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Nome da Eventualidade</label>
                       <input 
                         name="nome"
                         type="text" 
                         defaultValue={editingTempo?.label || ''}
                         placeholder="Ex: Hino de Padroeiros" 
                         className="w-full p-5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm dark:text-white"
                         required
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Breve Descrição</label>
                       <input 
                         name="descricao"
                         type="text" 
                         defaultValue={editingTempo?.description || ''}
                         placeholder="Descreva o uso..." 
                         className="w-full p-5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm dark:text-white"
                       />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      className="flex-1 sm:flex-none bg-blue-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                      {editingTempo ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingTempo ? 'Salvar Alterações' : 'Adicionar Registro'}
                    </motion.button>
                    {editingTempo && (
                      <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => setEditingTempo(null)}
                        className="flex-1 sm:flex-none bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-10 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                      >
                        <X className="w-5 h-5" />
                        Cancelar
                      </motion.button>
                    )}
                  </div>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {temposLiturgicos.map(s => (
                    <motion.div 
                      key={s.id} 
                      whileHover={{ x: 5 }}
                      className="flex items-center justify-between gap-4 bg-white/50 dark:bg-dark-bg/50 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 ${s.color} text-white rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-12`}>
                          {getSeasonIcon(s.id)}
                        </div>
                        <div>
                          <span className="font-black text-slate-800 dark:text-slate-200 block text-lg leading-tight uppercase italic">{s.label}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter opacity-60">{s.description}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!INITIAL_SEASONS.find(orig => orig.id === s.id) && (
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingTempo(s);
                              // Scroll to form
                              document.getElementById('tempoForm')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-blue-400 hover:text-blue-600 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl transition-all"
                            title="Editar Eventualidade"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                        {!INITIAL_SEASONS.find(orig => orig.id === s.id) && (
                          <button 
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!user) return;
                              const updated = temposLiturgicos.filter(x => x.id !== s.id);
                              try {
                                await updateDoc(doc(db, 'users', user.uid), { temposLiturgicos: updated });
                                showNotification(`Equipamento "${s.label}" removido.`, 'info');
                                if (editingTempo?.id === s.id) setEditingTempo(null);
                              } catch (err) {
                                handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                              }
                            }}
                            className="text-red-400 hover:text-red-600 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
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
                <div className="w-full px-2 sm:px-8 min-h-screen flex flex-col relative">
                  {/* Header Pillar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-6 border-b border-slate-200 dark:border-dark-border pb-6 sticky top-0 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md z-[130] -mx-2 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-4">
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
                      <div className="bg-amber-500 text-white px-6 py-4 rounded-3xl flex flex-col items-center shadow-[0_20px_40px_-10px_rgba(245,158,11,0.5)] border-2 border-amber-400 ring-4 ring-amber-500/10">
                        <span className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Tom Atual</span>
                        <span className="text-3xl font-black leading-none drop-shadow-md">{currentKey || '-'}</span>
                      </div>
                      
                      {currentCanto.tom && keyOffset !== 0 && (
                        <div className="bg-slate-100 dark:bg-dark-surface text-slate-400 dark:text-slate-600 px-4 py-2.5 rounded-2xl flex flex-col items-center border border-slate-200 dark:border-dark-border">
                          <span className="text-[9px] font-black uppercase tracking-tighter">Original</span>
                          <span className="text-lg font-black">{currentCanto.tom}</span>
                        </div>
                      )}

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
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsReadingModeOpen(false)}
                    className="fixed top-3 left-3 sm:top-4 sm:left-4 z-[200] bg-white dark:bg-dark-surface shadow-xl p-2 sm:p-2.5 rounded-full text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-dark-surface-hover hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-slate-200 dark:border-dark-border active:scale-90 flex items-center justify-center group"
                    title="Fechar"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                  
                  {/* Cifra Display Area with 3D Stand Effect */}
                  <div className="max-w-4xl mx-auto w-full relative mb-24 sm:mb-64 px-0 sm:px-0 mt-4 sm:mt-8">
                    <motion.div 
                      initial={{ scale: 0.95, y: 50, rotateX: 10 }}
                      animate={{ scale: 1, y: 0, rotateX: 0 }}
                      className="bg-white dark:bg-dark-surface min-h-[80vh] p-2 sm:p-16 rounded-xl sm:rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] border border-white dark:border-white/5 relative z-10 perspective-1000 overflow-x-auto"
                    >
                      {/* Paper Texture Overlay */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
                      
                      <div 
                        className="whitespace-pre text-slate-900 dark:text-white font-mono tracking-normal relative z-20 w-max min-w-full"
                        style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                      >
                         {/* Current Key Indicator on Paper */}
                         <div className="mb-8 sm:mb-12 inline-flex items-center gap-3 sm:gap-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-5 py-3 sm:px-8 sm:py-4 rounded-2xl sm:rounded-3xl shadow-inner font-black text-base sm:text-lg uppercase tracking-widest relative overflow-hidden group">
                           <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <span className="text-slate-400 dark:text-slate-600 text-[10px] sm:text-[12px]">Tom:</span>
                           <span className="text-slate-900 dark:text-white text-2xl sm:text-3xl drop-shadow-sm">{currentKey}</span>
                           {keyOffset !== 0 && (
                             <span className="ml-2 text-[9px] sm:text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-blue-200 dark:border-blue-800 whitespace-nowrap">Transposto</span>
                           )}
                         </div>
                        <div className="px-2 sm:px-0">
                          {formattedLetra}
                        </div>
                      </div>
                    </motion.div>
                    
                    {/* 3D Base/Stand Effect */}
                    <div className="absolute -bottom-8 left-10 right-10 h-20 bg-slate-200 dark:bg-slate-900 rounded-[3rem] blur-xl opacity-50 -z-10" />
                  </div>

                  {/* Floating Action Center (Top Right) - Consolidated into 1st Menu */}
                  <div className="fixed right-2 sm:right-4 md:right-8 bottom-6 sm:top-24 sm:translate-y-0 flex flex-col items-end gap-2 sm:gap-4 z-[140] perspective-1000">
                    <motion.button 
                      whileHover={{ scale: 1.1, rotate: 10, z: 50 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowFloatingMenu(!showFloatingMenu)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all pointer-events-auto border-2 ${
                        showFloatingMenu 
                          ? 'bg-red-500 border-red-400 text-white rotate-90' 
                          : 'bg-white border-blue-100 text-blue-600 dark:bg-dark-surface dark:border-dark-border dark:text-blue-400'
                      }`}
                    >
                      {showFloatingMenu ? <X className="w-8 h-8" /> : <Settings className="w-8 h-8" />}
                    </motion.button>

                    <AnimatePresence>
                      {showFloatingMenu && (
                        <motion.div 
                          initial={{ opacity: 0, x: 50, scale: 0.8, rotateY: 30 }}
                          animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                          exit={{ opacity: 0, x: 50, scale: 0.8, rotateY: 30 }}
                          transition={{ type: "spring", stiffness: 260, damping: 20 }}
                          className="flex flex-col gap-2 sm:gap-3 pointer-events-auto max-h-[70vh] overflow-y-auto no-scrollbar py-2 sm:py-4 px-1 preserve-3d"
                        >
                          {/* Auto-Scroll Controls */}
                          <motion.div 
                            whileHover={{ scale: 1.05, translateZ: 20 }}
                            className="flex flex-col items-center bg-white/40 dark:bg-dark-surface/40 backdrop-blur-2xl rounded-full p-1.5 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                          >
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
                          </motion.div>

                          {/* Transposition */}
                          <motion.div 
                            whileHover={{ scale: 1.05, translateZ: 20 }}
                            className="flex flex-col items-center bg-white/40 dark:bg-dark-surface/40 backdrop-blur-2xl rounded-[2rem] p-1.5 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                          >
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
                          </motion.div>

                          {/* Zoom & Display */}
                          <motion.div 
                            whileHover={{ scale: 1.05, translateZ: 20 }}
                            className="flex flex-col items-center bg-white/40 dark:bg-dark-surface/40 backdrop-blur-2xl rounded-[2rem] p-2 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                          >
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

                            <button 
                              onClick={handleShare}
                              className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-90 mb-2"
                              title="Compartilhar"
                            >
                              <Share2 className="w-5 h-5" />
                            </button>
                            
                            <div className="h-px w-8 bg-slate-100/50 dark:bg-white/10 mb-2" />
                            
                            <button 
                              onClick={() => setShowChords(!showChords)}
                              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 border shadow-sm mb-2
                                ${!showChords ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                              title={showChords ? "Ocultar Cifras" : "Mostrar Cifras"}
                            >
                              <Music className="w-5 h-5" />
                            </button>
                            <div className="h-px w-8 bg-slate-100/50 dark:bg-white/10 mb-2" />
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
                          </motion.div>
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

      <AnimatePresence>
        {isAgendaModalOpen && (
          <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center p-4 z-[200] backdrop-blur-2xl px-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotateX: -20 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotateX: -20 }}
              className="bg-white/95 dark:bg-dark-surface/95 rounded-[4rem] w-full max-w-2xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden preserve-3d"
            >
              <div className="p-10 pb-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-dark-surface/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] leading-none">Formulário Digital</span>
                  <h3 className="text-3xl font-serif font-black text-slate-900 dark:text-white leading-none">
                    {editingAgenda ? 'Ajustar Evento' : 'Novo Roteiro'}
                  </h3>
                </div>
                <button onClick={() => setIsAgendaModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-dark-bg flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 py-8 overflow-y-auto flex-1 custom-scrollbar">
                <form id="agendaForm" onSubmit={handleSaveAgenda} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Resumo do Evento</label>
                       <div className="relative group">
                         <div className="absolute inset-0 bg-blue-600/5 group-focus-within:bg-blue-600/10 rounded-3xl transition-colors" />
                         <input 
                           name="titulo"
                           defaultValue={editingAgenda?.titulo}
                           placeholder="Ex: Missa de Domingo" 
                           className="w-full bg-transparent p-5 rounded-3xl outline-none focus:ring-2 focus:ring-blue-600/20 font-black text-lg dark:text-white relative z-10 placeholder:opacity-30" 
                           required
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Coordenadas / Local</label>
                       <div className="relative group">
                         <div className="absolute inset-0 bg-emerald-600/5 group-focus-within:bg-emerald-600/10 rounded-3xl transition-colors" />
                         <input 
                           name="local"
                           defaultValue={editingAgenda?.local}
                           placeholder="Ex: Igreja Matriz" 
                           className="w-full bg-transparent p-5 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-600/20 font-black text-lg dark:text-white relative z-10 placeholder:opacity-30" 
                         />
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Cronometragem</label>
                       <div className="relative group">
                         <div className="absolute inset-0 bg-purple-600/5 group-focus-within:bg-purple-600/10 rounded-3xl transition-colors" />
                         <input 
                           name="data"
                           type="datetime-local" 
                           defaultValue={editingAgenda?.data}
                           className="w-full bg-transparent p-5 rounded-3xl outline-none focus:ring-2 focus:ring-purple-600/20 font-black text-lg dark:text-white relative z-10" 
                           required
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-4">Frequência</label>
                       <div className="relative group">
                         <div className="absolute inset-0 bg-amber-600/5 group-focus-within:bg-amber-600/10 rounded-3xl transition-colors" />
                         <select 
                           name="recorrencia" 
                           defaultValue={editingAgenda?.recorrencia || 'unica'}
                           className="w-full bg-transparent p-5 rounded-3xl outline-none focus:ring-2 focus:ring-amber-600/20 font-black text-lg dark:text-white relative z-10 appearance-none cursor-pointer"
                         >
                           <option value="unica">Única</option>
                           <option value="mensal">Mensal</option>
                           <option value="anual">Anual</option>
                         </select>
                       </div>
                    </div>
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[250] backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="bg-white dark:bg-dark-surface rounded-[2rem] p-8 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-dark-border"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h3 className="text-2xl font-serif font-black text-blue-900 dark:text-blue-400 leading-none">Selecionar Músicas</h3>
                  <span className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{selectedCantosForAgenda.length} selecionada(s)</span>
                </div>
                <button 
                  onClick={() => setShowCantoPicker(false)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                >
                  Concluir
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
                        showNotification(`${canto.nome} adicionada.`, 'info');
                      }}
                      className={`w-full text-left p-4 rounded-2xl bg-white dark:bg-dark-bg border transition-all flex justify-between items-center
                        ${selectedCantosForAgenda.includes(canto.id) 
                          ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10' 
                          : 'border-slate-100 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-800'}`}
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
                      <div className="flex items-center gap-2">
                        {selectedCantosForAgenda.includes(canto.id) && (
                          <div className="bg-blue-600 text-white p-1 rounded-full">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <Plus className="w-5 h-5 text-blue-400 dark:text-blue-500" />
                      </div>
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
                      className="w-full border border-slate-200 dark:border-dark-border p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg dark:text-white outline-none font-bold"
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


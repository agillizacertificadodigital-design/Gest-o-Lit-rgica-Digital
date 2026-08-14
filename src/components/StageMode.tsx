/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Minus, 
  Maximize, 
  Minimize, 
  Type, 
  Columns, 
  Music, 
  Activity, 
  Sparkles, 
  Sliders, 
  BookOpen, 
  FileText,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { Canto, AgendaItem, RepertorioItem } from '../types';
import { NOTES_SHARP, NOTES_FLAT, NOTE_MAP } from '../constants';
import { parseChordsFromText, transposeChordPro, transposeChord } from '../lib/chordPro';
import { metronome } from '../lib/metronome';

interface StageModeProps {
  canto: Canto;
  agenda?: AgendaItem | null;
  initialIndex?: number;
  onClose: () => void;
  allCantos?: Canto[];
}

export function StageMode({
  canto,
  agenda,
  initialIndex = 0,
  onClose,
  allCantos = []
}: StageModeProps) {
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Active song resolution
  const currentSong = agenda && agenda.repertorio && agenda.repertorio[currentIndex]
    ? (allCantos.find(c => String(c.id) === String(agenda.repertorio![currentIndex].cantoId)) || canto)
    : canto;

  // Key state (defaults to celebration's specific tone if available, or song's tone)
  const initialKey = agenda?.repertorio?.[currentIndex]?.tom || currentSong.tom || 'C';
  const [activeKey, setActiveKey] = useState<string>(initialKey);

  // When song index changes, update key
  useEffect(() => {
    const keyForCurrent = agenda?.repertorio?.[currentIndex]?.tom || currentSong.tom || 'C';
    setActiveKey(keyForCurrent);
  }, [currentIndex, currentSong]);

  // View Controls
  const [fontSize, setFontSize] = useState<number>(18);
  const [columns, setColumns] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'chords' | 'lyricsOnly'>('chords');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-scroll State
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(2); // 1 to 5
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);

  // Metronome State
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [currentBpm, setCurrentBpm] = useState<number>(currentSong.bpm || 100);
  const [visualPulse, setVisualPulse] = useState(false);

  // Sync BPM when song changes
  useEffect(() => {
    if (currentSong.bpm) {
      setCurrentBpm(currentSong.bpm);
      metronome.setBpm(currentSong.bpm);
    }
  }, [currentSong]);

  // Metronome listeners
  useEffect(() => {
    const handleTick = (_beat: number) => {
      setVisualPulse(true);
      setTimeout(() => setVisualPulse(false), 120);
    };

    const unsub = metronome.onTick(handleTick);
    return () => {
      metronome.stop();
      setIsMetronomePlaying(false);
      if (unsub) unsub();
    };
  }, []);

  const toggleMetronome = () => {
    if (isMetronomePlaying) {
      metronome.stop();
      setIsMetronomePlaying(false);
    } else {
      metronome.setBpm(currentBpm);
      metronome.start();
      setIsMetronomePlaying(true);
    }
  };

  // Auto-Scroll Loop
  useEffect(() => {
    let lastTime = performance.now();

    const doScroll = (time: number) => {
      if (!isScrolling || !scrollContainerRef.current) return;
      const delta = time - lastTime;
      lastTime = time;

      const pixelsPerSec = scrollSpeed * 25; // 25px/s to 125px/s
      const scrollStep = (pixelsPerSec * delta) / 1000;

      scrollContainerRef.current.scrollTop += scrollStep;

      // Check if reached bottom
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 2) {
        setIsScrolling(false);
        return;
      }

      scrollAnimRef.current = requestAnimationFrame(doScroll);
    };

    if (isScrolling) {
      lastTime = performance.now();
      scrollAnimRef.current = requestAnimationFrame(doScroll);
    } else if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
    }

    return () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
      }
    };
  }, [isScrolling, scrollSpeed]);

  // Reset scroll to top
  const handleResetScroll = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsScrolling(false);
  };

  // Transposition Helpers
  const originalKey = currentSong.tom || 'C';
  const origIdx = NOTE_MAP[originalKey] ?? 0;
  const targetIdx = NOTE_MAP[activeKey] ?? 0;
  const semitonesDiff = (targetIdx - origIdx + 12) % 12;

  const handleShiftSemitone = (delta: number) => {
    const currentIdx = NOTE_MAP[activeKey] ?? 0;
    const newIdx = (currentIdx + delta + 12) % 12;
    setActiveKey(NOTES_SHARP[newIdx]);
  };

  // Parsed and transposed lines
  const transposedRawText = semitonesDiff !== 0 
    ? transposeChordPro(currentSong.letra || '', semitonesDiff, activeKey)
    : (currentSong.letra || '');

  interface StageLine {
    isSectionHeader?: boolean;
    isChordOnly?: boolean;
    pairs?: { chord?: string; lyric?: string }[];
    text?: string;
  }

  const parsedLines = useMemo((): StageLine[] => {
    if (!transposedRawText) return [];
    const rawLines = transposedRawText.split('\n');
    const result: StageLine[] = [];

    const isSectionHeader = (line: string): boolean => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.includes('][')
      ) || /^(intro|refrão|verso|ponte|solo|final|pre-refrão|coda|estrofe)/i.test(trimmed);
    };

    const isChordWord = (w: string) => /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(\/[A-G][#b]?)?$/i.test(w);

    const isChordOnlyLine = (line: string): boolean => {
      const trimmed = line.trim();
      if (!trimmed || isSectionHeader(trimmed)) return false;
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (words.length === 0) return false;
      return words.every(w => isChordWord(w) || /^[|:/\-_\\[\]]+$/.test(w));
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        result.push({ text: '' });
        continue;
      }

      if (isSectionHeader(trimmed)) {
        const clean = trimmed.replace(/[\[\]]/g, '');
        result.push({ isSectionHeader: true, text: clean });
        continue;
      }

      // If it contains ChordPro brackets [G]
      if (line.includes('[') && /\[[A-G][#b]?[^\]]*\]/i.test(line)) {
        const pairs: { chord?: string; lyric?: string }[] = [];
        const parts = line.split(/(\[[^\]]+\])/);

        let currentChord: string | undefined = undefined;
        for (const part of parts) {
          if (part.startsWith('[') && part.endsWith(']')) {
            currentChord = part.slice(1, -1);
          } else if (part.length > 0 || currentChord) {
            pairs.push({ chord: currentChord, lyric: part });
            currentChord = undefined;
          }
        }
        if (currentChord) {
          pairs.push({ chord: currentChord, lyric: '' });
        }
        result.push({ pairs });
        continue;
      }

      // Check standard 2-line chords over lyrics
      if (isChordOnlyLine(line)) {
        const nextLine = rawLines[i + 1] || '';
        if (nextLine && !isChordOnlyLine(nextLine) && !isSectionHeader(nextLine.trim())) {
          // Both chords and lyrics exist
          result.push({
            pairs: [
              { chord: line.trim(), lyric: nextLine }
            ]
          });
          i++; // Skip lyrics line
          continue;
        } else {
          result.push({ isChordOnly: true, text: line });
          continue;
        }
      }

      result.push({ text: line });
    }

    return result;
  }, [transposedRawText]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Repertoire list
  const repertoireItems = agenda?.repertorio || [];
  const hasRepertoireNav = repertoireItems.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* TOP COMPACT CONTROL BAR */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-800/80 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shadow-md">
        
        {/* Left: Close & Song Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            id="stage-btn-close"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Sair do Modo Palco"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-white truncate">
                {currentSong.nome}
              </h2>
              {agenda && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 font-bold border border-blue-700/50 hidden sm:inline-block">
                  {agenda.titulo}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {currentSong.artista || 'Católico'} • Momento: {agenda?.repertorio?.[currentIndex]?.momento || currentSong.tipo || 'Momento'}
            </p>
          </div>
        </div>

        {/* Center: TRANSPOSITION CONTROLS */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-2xl border border-slate-700">
          <span className="text-xs font-bold text-slate-400 hidden sm:inline">Tom:</span>
          
          <button
            id="stage-btn-key-down"
            onClick={() => handleShiftSemitone(-1)}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all font-mono font-bold text-xs"
            title="Diminuir meio-tom (-1)"
          >
            ♭ -
          </button>

          {/* Quick key dropdown */}
          <select
            value={activeKey}
            onChange={(e) => setActiveKey(e.target.value)}
            className="bg-transparent font-black text-sm text-blue-400 focus:outline-none cursor-pointer text-center px-1"
          >
            {NOTES_SHARP.map(n => (
              <option key={n} value={n} className="bg-slate-900 text-white">{n}</option>
            ))}
          </select>

          <button
            id="stage-btn-key-up"
            onClick={() => handleShiftSemitone(1)}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all font-mono font-bold text-xs"
            title="Aumentar meio-tom (+1)"
          >
            + ♯
          </button>
        </div>

        {/* Right: METRONOME & VIEW SETTINGS */}
        <div className="flex items-center gap-1.5">
          
          {/* Metronome trigger */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-2xl border border-slate-700">
            <button
              id="stage-btn-metronome"
              onClick={toggleMetronome}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                isMetronomePlaying
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title={isMetronomePlaying ? 'Parar Metrônomo' : 'Iniciar Metrônomo'}
            >
              <Activity className={`w-4 h-4 ${visualPulse ? 'scale-125 text-amber-300' : ''}`} />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 hidden sm:inline">
              {currentBpm} <span className="text-[10px] text-slate-500">BPM</span>
            </span>
          </div>

          {/* Font Size Buttons */}
          <div className="hidden md:flex items-center gap-0.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
            <button
              onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
              className="p-1 rounded-lg text-slate-300 hover:text-white"
              title="Diminuir fonte"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 font-bold text-slate-400">{fontSize}px</span>
            <button
              onClick={() => setFontSize(prev => Math.min(36, prev + 2))}
              className="p-1 rounded-lg text-slate-300 hover:text-white"
              title="Aumentar fonte"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lyrics Only / Chords Toggle */}
          <button
            onClick={() => setViewMode(prev => prev === 'chords' ? 'lyricsOnly' : 'chords')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'lyricsOnly'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Alternar entre Cifra Completa e Apenas Letra"
          >
            {viewMode === 'lyricsOnly' ? 'Letra' : 'Cifra'}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors hidden sm:block"
            title="Tela cheia"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

        </div>
      </header>

      {/* REPERTOIRE NAVIGATION TABS (If inside celebration) */}
      {hasRepertoireNav && (
        <div className="shrink-0 bg-slate-900/60 border-b border-slate-800/60 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {repertoireItems.map((item, idx) => {
            const s = allCantos.find(c => String(c.id) === String(item.cantoId));
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="text-[10px] opacity-70">{idx + 1}.</span>
                <span>{item.momento || s?.tipo || 'Canto'}</span>
                <span className="text-[10px] px-1 py-0.2 bg-black/30 rounded font-mono">
                  {item.tom || s?.tom || 'C'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN CHORD VIEWER SCROLLING BODY */}
      <main 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scroll-smooth"
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className="max-w-4xl mx-auto space-y-6 pb-32">
          
          {/* Song Header Info on Sheet */}
          <div className="border-b border-slate-800 pb-4 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentSong.nome}
              </h1>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 font-mono font-bold text-sm">
                  Tom: {activeKey} {activeKey !== originalKey && `(Orig: ${originalKey})`}
                </span>
                {currentSong.bpm && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs">
                    ♩ {currentSong.bpm} BPM
                  </span>
                )}
                {currentSong.compasso && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs">
                    {currentSong.compasso}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {currentSong.artista || 'Católico'} {currentSong.compositor ? `• Comp: ${currentSong.compositor}` : ''}
            </p>
          </div>

          {/* Rendered Lines */}
          <div className={`space-y-4 font-mono leading-relaxed ${columns === 2 ? 'md:columns-2 gap-8' : ''}`}>
            {parsedLines.map((line, idx) => {
              // Section Header Line like [Intro], [Refrão], [Verso]
              if (line.isSectionHeader) {
                return (
                  <div 
                    key={idx} 
                    className="pt-4 pb-1 font-sans font-black text-blue-400 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {line.text}
                  </div>
                );
              }

              // Chord Only Line
              if (line.isChordOnly) {
                if (viewMode === 'lyricsOnly') return null;
                return (
                  <div key={idx} className="text-amber-400 font-bold tracking-wide whitespace-pre-wrap select-text">
                    {line.text}
                  </div>
                );
              }

              // Paired Chords + Lyrics
              if (line.pairs && line.pairs.length > 0) {
                return (
                  <div key={idx} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1 select-text">
                    {line.pairs.map((pair, pIdx) => (
                      <div key={pIdx} className="inline-flex flex-col">
                        {viewMode === 'chords' && pair.chord && (
                          <span className="text-amber-400 font-bold text-[0.9em] leading-none mb-1">
                            {pair.chord}
                          </span>
                        )}
                        <span className="text-slate-100 font-sans leading-normal">
                          {pair.lyric || '\u00A0'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }

              // Plain Text line
              return (
                <div key={idx} className="text-slate-200 font-sans whitespace-pre-wrap select-text">
                  {line.text}
                </div>
              );
            })}
          </div>

        </div>
      </main>

      {/* BOTTOM FLOATING CONTROLS: AUTOSCROLL & SONG SWITCHER */}
      <footer className="shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        
        {/* Left: Repertoire Previous / Next Buttons */}
        {hasRepertoireNav ? (
          <div className="flex items-center gap-2">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs disabled:opacity-30 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <span className="text-xs font-bold text-slate-400">
              {currentIndex + 1} de {repertoireItems.length}
            </span>

            <button
              disabled={currentIndex === repertoireItems.length - 1}
              onClick={() => setCurrentIndex(prev => Math.min(repertoireItems.length - 1, prev + 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs disabled:opacity-30 cursor-pointer"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">
            Música Individual
          </div>
        )}

        {/* Center/Right: AUTOSCROLL CONTROLLER (Section 15) */}
        <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-2xl border border-slate-700">
          
          <button
            id="stage-btn-autoscroll-toggle"
            onClick={() => setIsScrolling(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer ${
              isScrolling
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            {isScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isScrolling ? 'Pausar Rolagem' : 'Rolar'}</span>
          </button>

          {/* Speed Controls: 1 to 5 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">Vel:</span>
            {[1, 2, 3, 4, 5].map(spd => (
              <button
                key={spd}
                onClick={() => setScrollSpeed(spd)}
                className={`w-6 h-6 rounded-lg text-xs font-bold font-mono transition-all ${
                  scrollSpeed === spd
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {spd}
              </button>
            ))}
          </div>

          <button
            onClick={handleResetScroll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            title="Voltar ao início da cifra"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

        </div>

      </footer>

    </div>
  );
}

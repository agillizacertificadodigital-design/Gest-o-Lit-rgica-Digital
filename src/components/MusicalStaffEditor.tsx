import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Trash2, 
  Plus, 
  Minus,
  Volume2, 
  Music, 
  Info,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Printer
} from 'lucide-react';
import { NoteOnStaff } from '../types';

interface MusicalStaffEditorProps {
  notes: NoteOnStaff[];
  onChange: (notes: NoteOnStaff[]) => void;
  bpm?: number;
  isReadOnly?: boolean;
  clef?: 'sol' | 'fa' | 'do';
  onChangeClef?: (clef: 'sol' | 'fa' | 'do') => void;
  compasso?: string;
  onChangeCompasso?: (compasso: string) => void;
  songTitle?: string;
}

// Map pitch line coordinates (0 to 12) to note names and frequencies (Treble Clef / Clave de Sol)
// 0 = C4 (middle C, with a ledger line), 1 = D4, 2 = E4 (1st staff line)... 12 = A5
export const PITCH_DETAILS_SOL: { [key: number]: { name: string; hz: number; isLine: boolean; label: string } } = {
  0: { name: 'C4', hz: 261.63, isLine: true, label: 'Dó' },
  1: { name: 'D4', hz: 293.66, isLine: false, label: 'Ré' },
  2: { name: 'E4', hz: 329.63, isLine: true, label: 'Mi' },
  3: { name: 'F4', hz: 349.23, isLine: false, label: 'Fá' },
  4: { name: 'G4', hz: 392.00, isLine: true, label: 'Sol' },
  5: { name: 'A4', hz: 440.00, isLine: false, label: 'Lá' },
  6: { name: 'B4', hz: 493.88, isLine: true, label: 'Si' },
  7: { name: 'C5', hz: 523.25, isLine: false, label: 'Dó' },
  8: { name: 'D5', hz: 587.33, isLine: true, label: 'Ré' },
  9: { name: 'E5', hz: 659.25, isLine: false, label: 'Mi' },
  10: { name: 'F5', hz: 698.46, isLine: true, label: 'Fá' },
  11: { name: 'G5', hz: 783.99, isLine: false, label: 'Sol' },
  12: { name: 'A5', hz: 880.00, isLine: true, label: 'Lá' }
};

// Map pitch line coordinates (0 to 12) to note names and frequencies (Bass Clef / Clave de Fá)
// 0 = E2, 1 = F2, 2 = G2 (1st line)... 12 = C4
export const PITCH_DETAILS_FA: { [key: number]: { name: string; hz: number; isLine: boolean; label: string } } = {
  0: { name: 'E2', hz: 82.41, isLine: true, label: 'Mi' },
  1: { name: 'F2', hz: 87.31, isLine: false, label: 'Fá' },
  2: { name: 'G2', hz: 98.00, isLine: true, label: 'Sol' },
  3: { name: 'A2', hz: 110.00, isLine: false, label: 'Lá' },
  4: { name: 'B2', hz: 123.47, isLine: true, label: 'Si' },
  5: { name: 'C3', hz: 130.81, isLine: false, label: 'Dó' },
  6: { name: 'D3', hz: 146.83, isLine: true, label: 'Ré' },
  7: { name: 'E3', hz: 164.81, isLine: false, label: 'Mi' },
  8: { name: 'F3', hz: 174.61, isLine: true, label: 'Fá' },
  9: { name: 'G3', hz: 196.00, isLine: false, label: 'Sol' },
  10: { name: 'A3', hz: 220.00, isLine: true, label: 'Lá' },
  11: { name: 'B3', hz: 246.94, isLine: false, label: 'Si' },
  12: { name: 'C4', hz: 261.63, isLine: true, label: 'Dó' }
};

// Map pitch line coordinates (0 to 12) to note names and frequencies (Alto Clef / Clave de Dó na 3ª linha)
// 0 = D3, 1 = E3, 2 = F3 (1st line)... 6 = C4 (3rd line)... 12 = B4
export const PITCH_DETAILS_DO: { [key: number]: { name: string; hz: number; isLine: boolean; label: string } } = {
  0: { name: 'D3', hz: 146.83, isLine: true, label: 'Ré' },
  1: { name: 'E3', hz: 164.81, isLine: false, label: 'Mi' },
  2: { name: 'F3', hz: 174.61, isLine: true, label: 'Fá' },
  3: { name: 'G3', hz: 196.00, isLine: false, label: 'Sol' },
  4: { name: 'A3', hz: 220.00, isLine: true, label: 'Lá' },
  5: { name: 'B3', hz: 246.94, isLine: false, label: 'Si' },
  6: { name: 'C4', hz: 261.63, isLine: true, label: 'Dó' },
  7: { name: 'D4', hz: 293.66, isLine: false, label: 'Ré' },
  8: { name: 'E4', hz: 329.63, isLine: true, label: 'Mi' },
  9: { name: 'F4', hz: 349.23, isLine: false, label: 'Fá' },
  10: { name: 'G4', hz: 392.00, isLine: true, label: 'Sol' },
  11: { name: 'A4', hz: 440.00, isLine: false, label: 'Lá' },
  12: { name: 'B4', hz: 493.88, isLine: true, label: 'Si' }
};

export const PITCH_DETAILS = PITCH_DETAILS_SOL;

export const FIGURE_DURATIONS: { [key: string]: { label: string; beats: number; name: string } } = {
  'semibreve': { label: 'Semibreve 𝅝 (4 tempos)', beats: 4, name: 'Semibreve' },
  'minima': { label: 'Mínima 𝅗𝅥 (2 tempos)', beats: 2, name: 'Mínima' },
  'seminima': { label: 'Semínima 𝅘𝅥 (1 tempo)', beats: 1, name: 'Semínima' },
  'colcheia': { label: 'Colcheia 𝅘𝅥𝅮 (1/2 tempo)', beats: 0.5, name: 'Colcheia' },
  'semicolcheia': { label: 'Semicolcheia 𝅘𝅥𝅯 (1/4 tempo)', beats: 0.25, name: 'Semicolcheia' },
  'fusa': { label: 'Fusa 𝅘𝅥𝅰 (1/8 tempo)', beats: 0.125, name: 'Fusa' },
  'semifusa': { label: 'Semifusa 𝅘𝅥𝅱 (1/16 tempo)', beats: 0.0625, name: 'Semifusa' },
  'pausa_semibreve': { label: 'Pausa de Semibreve (4 tempos)', beats: 4, name: 'Pausa Semibreve' },
  'pausa_minima': { label: 'Pausa de Mínima (2 tempos)', beats: 2, name: 'Pausa Mínima' },
  'pausa_seminima': { label: 'Pausa de Semínima (1 tempo)', beats: 1, name: 'Pausa Semínima' },
  'pausa_colcheia': { label: 'Pausa de Colcheia (1/2 tempo)', beats: 0.5, name: 'Pausa Colcheia' },
  'pausa_semicolcheia': { label: 'Pausa de Semicolcheia (1/4 tempo)', beats: 0.25, name: 'Pausa Semicolcheia' },
  'pausa_fusa': { label: 'Pausa de Fusa (1/8 tempo)', beats: 0.125, name: 'Pausa Fusa' },
  'pausa_semifusa': { label: 'Pausa de Semifusa (1/16 tempo)', beats: 0.0625, name: 'Pausa Semifusa' }
};

export default function MusicalStaffEditor({ 
  notes, 
  onChange, 
  bpm = 120, 
  isReadOnly = false,
  clef = 'sol',
  onChangeClef,
  compasso = '4/4',
  onChangeCompasso,
  songTitle
}: MusicalStaffEditorProps) {
  const pitchDetails = clef === 'fa' ? PITCH_DETAILS_FA : clef === 'do' ? PITCH_DETAILS_DO : PITCH_DETAILS_SOL;
  const parsedCompasso = (compasso || '4/4').split('/');
  const topNum = parsedCompasso[0] || '4';
  const bottomNum = parsedCompasso[1] || '4';

  const [selectedFigure, setSelectedFigure] = useState<string>('seminima');
  const [selectedAccidental, setSelectedAccidental] = useState<'sharp' | 'flat' | 'natural' | 'none'>('none');
  const [hoveredLineAndPitch, setHoveredLineAndPitch] = useState<{ lineIdx: number; pitchLine: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [linesCount, setLinesCount] = useState<number>(() => {
    if (!notes || notes.length === 0) return 1;
    const maxLineIdx = Math.max(0, ...notes.map(n => n.lineIndex || 0));
    return maxLineIdx + 1;
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<any[]>([]);
  const playbackTimeoutRef = useRef<any>(null);

  const staffContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize linesCount when notes are loaded
  useEffect(() => {
    if (notes && notes.length > 0) {
      const maxLineIdx = Math.max(0, ...notes.map(n => n.lineIndex || 0));
      if (maxLineIdx >= linesCount) {
        setLinesCount(maxLineIdx + 1);
      }
    }
  }, [notes]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const handlePrintOnlyStaff = () => {
    const portalId = 'print-pauta-portal-element';
    let portal = document.getElementById(portalId);
    if (!portal) {
      portal = document.createElement('div');
      portal.id = portalId;
      document.body.appendChild(portal);
    }

    if (!staffContainerRef.current) return;

    // Clone the relative container holding the SVGs
    const containerClone = staffContainerRef.current.cloneNode(true) as HTMLElement;
    
    // Within containerClone, strip scale and reset width/height for print layout
    const wrapperDivs = containerClone.querySelectorAll('.relative.flex-shrink-0') as NodeListOf<HTMLElement>;
    wrapperDivs.forEach((div) => {
      div.style.width = '100%';
      div.style.height = '140px';
    });

    const scaledInnerDivs = containerClone.querySelectorAll('div[style*="scale"]') as NodeListOf<HTMLElement>;
    scaledInnerDivs.forEach((div) => {
      div.style.transform = 'none';
      div.style.transformOrigin = 'initial';
      div.style.position = 'relative';
      div.style.width = '100%';
      div.style.height = '140px';
    });

    // Populate print layout
    portal.innerHTML = `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background: white; color: black; padding: 40px; box-sizing: border-box; width: 100%;">
        <div style="margin-bottom: 30px; text-align: center; border-bottom: 2px solid #000000; padding-bottom: 16px;">
          <h1 style="font-size: 28px; font-weight: 850; margin: 0 0 8px 0; color: #000000; text-transform: uppercase; letter-spacing: 0.05em;">
            ${songTitle || 'Partitura / Melodia'}
          </h1>
          <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #000000; letter-spacing: 0.08em; display: flex; justify-content: center; gap: 16px;">
            <span><strong>Clave:</strong> de ${clef === 'fa' ? 'Fá' : clef === 'do' ? 'Dó' : 'Sol'}</span>
            <span>•</span>
            <span><strong>Compasso:</strong> ${compasso || '4/4'}</span>
            <span>•</span>
            <span><strong>BPM:</strong> ${bpm || 120}</span>
          </div>
        </div>

        <div style="width: 100%; display: flex; flex-direction: column; gap: 24px; justify-content: flex-start; overflow: visible; background: white; padding: 20px 0;">
          ${containerClone ? containerClone.innerHTML : ''}
        </div>
        
        <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #000000; font-weight: bold; border-top: 1px dashed #000000; padding-top: 16px; text-transform: uppercase; letter-spacing: 0.05em;">
          Cifras Litúrgicas • Melodia da Pauta Musical
        </div>
      </div>
    `;

    // Inject dedicated print styles
    const styleId = 'print-pauta-style-override';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      @media print {
        /* Hide regular UI elements */
        body > *:not(#${portalId}) {
          display: none !important;
        }
        /* Page margins/setup */
        @page {
          size: landscape;
          margin: 1.5cm;
        }
        html, body {
          background: white !important;
          color: black !important;
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          width: 100% !important;
          overflow: visible !important;
        }
        #${portalId} {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          visibility: visible !important;
          background: white !important;
        }
        /* Clean up edit icons & selections */
        .delete-button-group, .ghost-highlight, .ghost-preview, .empty-state-pauta {
          display: none !important;
        }
        /* Ensure precise black strokes & clean vectors */
        svg, rect, line, path, text, circle, ellipse {
          color: #000000 !important;
          stroke: #000000 !important;
        }
        ellipse[fill="currentColor"] {
          fill: #000000 !important;
        }
        circle[fill="currentColor"] {
          fill: #000000 !important;
        }
        rect[fill="currentColor"] {
          fill: #000000 !important;
        }
        path[fill="currentColor"] {
          fill: #000000 !important;
        }
        text {
          fill: #000000 !important;
          stroke: none !important;
        }
        line {
          fill: none !important;
        }
        path[fill="none"] {
          fill: none !important;
        }
        ellipse[fill="none"] {
          fill: none !important;
        }
      }
      @media screen {
        #${portalId} {
          display: none !important;
        }
      }
    `;

    setTimeout(() => {
      window.print();
      // Cleanup after print dialog handles it
      styleTag?.remove();
      portal?.remove();
    }, 200);
  };

  // Compute Y coordinate on SVG from pitchLine (range 0 to 12)
  const getYForPitchLine = (lineValue: number) => {
    // 90 is C4 (middle C), each step of pitchLine is 5px
    return 95 - (lineValue * 5);
  };

  const handleStaffMouseMove = (e: React.MouseEvent<SVGSVGElement>, lineIdx: number) => {
    if (isReadOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = (e.clientY - rect.top) / zoom;
    
    // We want to snap from pitchLine 0 (Y=95) to 12 (Y=35)
    // Clickable vertical range: 30px to 100px
    const rawPitch = Math.round((95 - mouseY) / 5);
    const clampedPitch = Math.max(0, Math.min(12, rawPitch));
    
    setHoveredLineAndPitch({ lineIdx, pitchLine: clampedPitch });
  };

  const handleStaffMouseLeave = () => {
    setHoveredLineAndPitch(null);
  };

  const handleAddNote = (lineIdx: number) => {
    if (isReadOnly) return;
    if (hoveredLineAndPitch === null || hoveredLineAndPitch.lineIdx !== lineIdx) return;

    const isPause = selectedFigure.startsWith('pausa_');
    const newNote: NoteOnStaff = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedFigure,
      pitchLine: isPause ? 6 : hoveredLineAndPitch.pitchLine, // pauses always sit in the middle of staff (pitchLine 6)
      accidental: isPause ? 'none' : selectedAccidental,
      lineIndex: lineIdx
    };

    onChange([...notes, newNote]);
  };

  const handleRemoveNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    onChange(notes.filter(n => n.id !== id));
  };

  const handleClear = () => {
    if (isReadOnly) return;
    if (confirm('Deseja limpar toda a pauta musical?')) {
      onChange([]);
      setLinesCount(1);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }
    // stop all oscs
    activeOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    activeOscillatorsRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close().then(() => {
        audioCtxRef.current = null;
      });
    }
  };

  const playSong = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (notes.length === 0) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        alert('Web Audio API não é suportada neste navegador.');
        return;
      }

      setIsPlaying(true);
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      let time = ctx.currentTime + 0.1;
      const beatDuration = 60 / bpm; // duration of 1 beat (semínima) in seconds

      // Sort notes so notes on Line 0 are played first, then Line 1, etc.
      // Keeping their original insertion order within the same line
      const sortedNotes = [...notes].sort((a, b) => {
        const aLine = a.lineIndex ?? 0;
        const bLine = b.lineIndex ?? 0;
        if (aLine !== bLine) {
          return aLine - bLine;
        }
        return notes.indexOf(a) - notes.indexOf(b);
      });

      sortedNotes.forEach((note) => {
        const isPause = note.type.startsWith('pausa_');
        const durationDetails = FIGURE_DURATIONS[note.type];
        if (!durationDetails) return;

        const duration = durationDetails.beats * beatDuration;

        if (!isPause) {
          const pitchInfo = pitchDetails[note.pitchLine];
          if (pitchInfo) {
            let pitchHz = pitchInfo.hz;
            if (note.accidental === 'sharp') {
              pitchHz *= Math.pow(2, 1/12);
            } else if (note.accidental === 'flat') {
              pitchHz /= Math.pow(2, 1/12);
            }

            // Create organ-like synthesizer wave
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // Triangle wave sounds soft and clean for vocal/flute sheet music
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(pitchHz, time);

            // Envelope to avoid pop sounds
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.18, time + 0.02); // attack
            gain.gain.setValueAtTime(0.18, time + duration - 0.04);
            gain.gain.linearRampToValueAtTime(0, time + duration - 0.01); // release

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + duration);

            activeOscillatorsRef.current.push(osc);
          }
        }

        time += duration;
      });

      // Turn off playing flag when finished
      const totalDurationSecs = (time - ctx.currentTime) * 1000;
      playbackTimeoutRef.current = setTimeout(() => {
        setIsPlaying(false);
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
      }, totalDurationSecs);

    } catch (err) {
      console.error(err);
      setIsPlaying(false);
    }
  };

  // Icons and visual designs for standard sound figures
  const renderNoteHeadSVG = (nType: string, isGhost = false, ghostPitchLine: number | null = null, currentAccidental?: 'sharp' | 'flat' | 'natural' | 'none') => {
    const isPause = nType.startsWith('pausa_');
    const displayPitchLine = ghostPitchLine !== null ? ghostPitchLine : 6;
    
    // Y coords
    const noteY = isPause ? getYForPitchLine(6) : getYForPitchLine(displayPitchLine);
    const stemUp = displayPitchLine < 6; // low notes standard stem UP
    
    const fillProps = isGhost ? { opacity: 0.45 } : {};

    if (isPause) {
      // Draw various musical rests
      switch (nType) {
        case 'pausa_semibreve':
          // Hanging block from 4th line (Y = 55)
          return (
            <g {...fillProps}>
              <rect x="-6" y={getYForPitchLine(8)} width="12" height="6" fill="currentColor" />
            </g>
          );
        case 'pausa_minima':
          // Block sitting on 3rd line (Y = 65)
          return (
            <g {...fillProps}>
              <rect x="-6" y={getYForPitchLine(6) - 6} width="12" height="6" fill="currentColor" />
            </g>
          );
        case 'pausa_seminima':
          // Standard lightning Bolt path
          return (
            <g transform={`translate(0, ${getYForPitchLine(6) - 12})`} {...fillProps}>
              <path d="M -3 0 L 3 5 L -3 10 C 3 16, -5 20, 1 25" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        case 'pausa_colcheia':
          return (
            <g transform={`translate(0, ${getYForPitchLine(6) - 6})`} {...fillProps}>
              <circle cx="-2.5" cy="4" r="2.5" fill="currentColor" />
              <path d="M -2.5 4 C 3 4, 3 8, -3 15 L -1.5 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        case 'pausa_semicolcheia':
          return (
            <g transform={`translate(0, ${getYForPitchLine(6) - 10})`} {...fillProps}>
              <circle cx="-2.5" cy="4" r="2.5" fill="currentColor" />
              <path d="M -2.5 4 C 3 4, 3 8, -3 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="-3.5" cy="11" r="2.5" fill="currentColor" />
              <path d="M -3.5 11 C 2 11, 2 15, -4 22 L -2.5 26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        case 'pausa_fusa':
          return (
            <g transform={`translate(0, ${getYForPitchLine(6) - 12})`} {...fillProps}>
              {/* Simplified professional representation of fusa pauses */}
              <circle cx="-2.5" cy="2" r="2" fill="currentColor" />
              <circle cx="-3.5" cy="8" r="2" fill="currentColor" />
              <circle cx="-4.5" cy="14" r="2" fill="currentColor" />
              <path d="M -2.5 2 Q 2 4 -3 10 Q 1 12 -4 18 L -3 27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        case 'pausa_semifusa':
          return (
            <g transform={`translate(0, ${getYForPitchLine(6) - 14})`} {...fillProps}>
              <circle cx="-2" cy="0" r="1.8" fill="currentColor" />
              <circle cx="-3" cy="6" r="1.8" fill="currentColor" />
              <circle cx="-4" cy="12" r="1.8" fill="currentColor" />
              <circle cx="-5" cy="18" r="1.8" fill="currentColor" />
              <path d="M -2 0 Q 2 3 -3 8 Q 1 11 -4 16 Q 0 19 -5 22 L -3.5 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        default:
          return null;
      }
    }

    // Otherwise, draw sound notes with heads + stems + accidentals
    const isHollow = nType === 'semibreve' || nType === 'minima';
    const hasStem = nType !== 'semibreve';
    const numFlags = nType === 'colcheia' ? 1 : nType === 'semicolcheia' ? 2 : nType === 'fusa' ? 3 : nType === 'semifusa' ? 4 : 0;
    const accidentalValue = currentAccidental || selectedAccidental;

    return (
      <g transform={`translate(0, ${noteY})`} {...fillProps}>
        {/* Draw Ledger lines (linhas suplementares superiores/inferiores) */}
        {displayPitchLine === 0 && (
          <line x1="-12" y1="0" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" />
        )}
        {displayPitchLine === 12 && (
          <line x1="-12" y1="0" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" />
        )}

        {/* Draw Accidentals */}
        {accidentalValue === 'sharp' && (
          <text x="-16" y="5" className="font-sans font-bold text-base" fill="currentColor">♯</text>
        )}
        {accidentalValue === 'flat' && (
          <text x="-16" y="5" className="font-sans font-bold text-base" fill="currentColor">♭</text>
        )}
        {accidentalValue === 'natural' && (
          <text x="-16" y="5" className="font-sans font-bold text-base" fill="currentColor">♮</text>
        )}

        {/* Note Head Ellipse */}
        {isHollow ? (
          <ellipse cx="0" cy="0" rx="6.5" ry="4.5" transform="rotate(-25)" fill="none" stroke="currentColor" strokeWidth="2.5" />
        ) : (
          <ellipse cx="0" cy="0" rx="6.5" ry="4.5" transform="rotate(-25)" fill="currentColor" />
        )}

        {/* Note Stem (Haste) */}
        {hasStem && (
          stemUp ? (
            /* Stem pointing UP on the right side */
            <g id="stem-up">
              <line x1="6" y1="-2" x2="6" y2="-28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              {/* Optional Flags (Colchetes) */}
              {numFlags >= 1 && <path d="M 6 -28 Q 14 -19 6 -11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
              {numFlags >= 2 && <path d="M 6 -23 Q 14 -14 6 -6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
              {numFlags >= 3 && <path d="M 6 -18 Q 14 -9 6 -1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
              {numFlags >= 4 && <path d="M 6 -13 Q 14 -4 6 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
            </g>
          ) : (
            /* Stem pointing DOWN on the left side */
            <g id="stem-down">
              <line x1="-6" y1="2" x2="-6" y2="28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              {/* Flags pointing inside the staff */}
              {numFlags >= 1 && <path d="M -6 28 Q 2 19 -6 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
              {numFlags >= 2 && <path d="M -6 23 Q 2 14 -6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
              {numFlags >= 3 && <path d="M -6 18 Q 2 9 -6 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
              {numFlags >= 4 && <path d="M -6 13 Q 2 4 -6 -4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
            </g>
          )
        )}
      </g>
    );
  };

  const baseStaffWidth = isFullscreen ? 1160 : 520;
  const notesWidth = notes.length * 48 + 100;
  const unscaledNotesSvgWidth = Math.max(baseStaffWidth, notesWidth);
  const unscaledTotalWidth = unscaledNotesSvgWidth + 80;

  return (
    <div className={isFullscreen 
      ? "MusicalStaffEditor fixed inset-0 z-[100] bg-slate-50 dark:bg-dark-bg p-6 sm:p-10 flex flex-col space-y-6 overflow-y-auto animate-in fade-in duration-200"
      : "MusicalStaffEditor bg-slate-50 dark:bg-dark-bg p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-dark-border space-y-4"
    }>
      {/* 1. Header Toolbar Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Music className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              Composer Partitura <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full lowercase font-bold tracking-normal">beta</span>
              {isFullscreen && <span className="text-[10px] bg-indigo-600 text-white px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider">Tela Cheia</span>}
            </h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">Consiste em pauta para canto litúrgico</span>
          </div>
        </div>

        {/* Playback & Reset buttons */}
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title={isFullscreen ? "Sair da Tela Cheia" : "Escrever em Tela Cheia"}
            >
              {isFullscreen ? (
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <Minimize2 className="w-4 h-4" /> Minimizar
                </span>
              ) : (
                <span className="flex items-center gap-1.15 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <Maximize2 className="w-4 h-4" /> Tela Cheia
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={playSong}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 ${
              isPlaying
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white" /> PARAR
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" /> OUVIR PARTITURA
              </>
            )}
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setLinesCount(prev => prev + 1)}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all font-bold"
              title="Adicionar linha de pauta"
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Nova Linha</span>
            </button>
          )}

          {!isReadOnly && linesCount > 1 && (
            <button
              type="button"
              onClick={() => {
                const lastLineIdx = linesCount - 1;
                const hasNotes = notes.some(n => (n.lineIndex || 0) === lastLineIdx);
                if (!hasNotes || confirm('Deseja remover a última linha e apagar as notas dela?')) {
                  onChange(notes.filter(n => (n.lineIndex || 0) !== lastLineIdx));
                  setLinesCount(prev => Math.max(1, prev - 1));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all font-bold"
              title="Remover última linha de pauta"
            >
              <Minus className="w-4 h-4 text-red-500" />
              <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Remover Linha</span>
            </button>
          )}

          {notes.length > 0 && (
            <button
              type="button"
              onClick={handlePrintOnlyStaff}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Imprimir Pauta preenchida"
            >
              <Printer className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Imprimir</span>
            </button>
          )}

          {!isReadOnly && notes.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Limpar Pauta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings Row: Clef & Time Signature selection */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-100/50 dark:bg-dark-surface/40 p-3 rounded-2xl border border-slate-200/50 dark:border-dark-border/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Clave Inicial:</span>
          {isReadOnly ? (
            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-surface px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border">
              {clef === 'fa' ? '𝄢 Clave de Fá' : clef === 'do' ? '𝄡 Clave de Dó' : '𝄞 Clave de Sol'}
            </span>
          ) : (
            <div className="flex bg-white dark:bg-dark-surface p-1 rounded-xl border border-slate-200 dark:border-dark-border shadow-sm">
              <button
                type="button"
                onClick={() => onChangeClef?.('sol')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  clef === 'sol'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'
                }`}
              >
                𝄞 Clave de Sol
              </button>
              <button
                type="button"
                onClick={() => onChangeClef?.('fa')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  clef === 'fa'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'
                }`}
              >
                𝄢 Clave de Fá
              </button>
              <button
                type="button"
                onClick={() => onChangeClef?.('do')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  clef === 'do'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'
                }`}
              >
                𝄡 Clave de Dó
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Compasso:</span>
          {isReadOnly ? (
            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-surface px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border">
              {compasso || '4/4'}
            </span>
          ) : (
            <div className="flex bg-white dark:bg-dark-surface p-1 rounded-xl border border-slate-200 dark:border-dark-border shadow-sm items-center gap-1.5">
              <select
                value={['4/4', '3/4', '2/4', '6/8'].includes(compasso) ? compasso : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    onChangeCompasso?.(e.target.value);
                  }
                }}
                className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-300 outline-none px-2 py-1 cursor-pointer pr-1"
              >
                <option value="4/4" className="bg-white dark:bg-dark-surface">4/4</option>
                <option value="3/4" className="bg-white dark:bg-dark-surface">3/4</option>
                <option value="2/4" className="bg-white dark:bg-dark-surface">2/4</option>
                <option value="6/8" className="bg-white dark:bg-dark-surface">6/8</option>
                <option value="custom" className="bg-white dark:bg-dark-surface">Outro</option>
              </select>
              <span className="text-slate-300 dark:text-dark-border">|</span>
              <input
                type="text"
                placeholder="ex: 5/4"
                value={compasso || ''}
                onChange={(e) => onChangeCompasso?.(e.target.value)}
                className="w-16 bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none px-1 py-0.5 border border-transparent focus:border-blue-100 rounded-md"
              />
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Zoom:</span>
          <div className="flex bg-white dark:bg-dark-surface p-1 rounded-xl border border-slate-200 dark:border-dark-border shadow-sm items-center">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
              className="p-1 px-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all flex items-center justify-center min-w-[28px]"
              title="Diminuir Zoom"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-black px-2 text-slate-700 dark:text-slate-300 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(2.0, prev + 0.2))}
              className="p-1 px-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all flex items-center justify-center min-w-[28px]"
              title="Aumentar Zoom"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Staff Composer */}
      <div className="relative">
        <div 
          ref={staffContainerRef}
          className={`w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent rounded-2xl bg-white dark:bg-dark-surface p-4 border border-slate-100 dark:border-dark-border flex flex-col gap-6 ${isFullscreen ? 'py-8' : ''}`}
        >
          {Array.from({ length: linesCount }).map((_, lineIdx) => {
            const lineNotes = notes.filter(n => (n.lineIndex || 0) === lineIdx);
            const lineNotesWidth = lineNotes.length * 48 + 100;
            const unscaledLineNotesSvgWidth = Math.max(baseStaffWidth, lineNotesWidth);
            const unscaledLineTotalWidth = unscaledLineNotesSvgWidth + 80;

            const isHoveredOnThisLine = hoveredLineAndPitch?.lineIdx === lineIdx;
            const currentHoveredPitch = isHoveredOnThisLine ? hoveredLineAndPitch?.pitchLine : null;

            return (
              <div 
                key={lineIdx}
                style={{ 
                  width: `${unscaledLineTotalWidth * zoom}px`, 
                  height: `${140 * zoom}px` 
                }} 
                className="relative flex-shrink-0"
              >
                {/* Scaled Staff SVG Canvas */}
                <div 
                  style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'left top', 
                    width: `${unscaledLineTotalWidth}px`, 
                    height: '140px' 
                  }}
                  className="absolute left-0 top-0 flex items-center"
                >
                  {/* Display Clef + Key Signature + Time signature at the beginning */}
                  <svg 
                    className="absolute left-0 top-0 h-full w-[80px] pointer-events-none select-none text-slate-800 dark:text-white"
                    viewBox="0 0 80 140"
                  >
                    {/* Draw 5 Horizontal Lines of Staff */}
                    <line x1="10" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
                    <line x1="10" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
                    <line x1="10" y1="60" x2="80" y2="60" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
                    <line x1="10" y1="70" x2="80" y2="70" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
                    <line x1="10" y1="80" x2="80" y2="80" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />

                    {/* Clef Vector (Sol vs Fá vs Dó) */}
                    {clef === 'fa' ? (
                      /* Bass Clef Clave de Fá Vector */
                      <g transform="translate(16, 42) scale(1.05)">
                        <circle cx="4" cy="8" r="3.2" fill="currentColor" />
                        <path d="M 4 8 C 4 1, 15 1, 15 11 C 15 20, 5 26, 0 30" fill="none" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" />
                        <circle cx="19" cy="4" r="1.6" fill="currentColor" />
                        <circle cx="19" cy="11" r="1.6" fill="currentColor" />
                      </g>
                    ) : clef === 'do' ? (
                      /* Alto Clef Clave de Dó Vector centered on the 3rd line */
                      <g transform="translate(18, 40) scale(1.05)">
                        {/* Left double vertical bars */}
                        <rect x="0" y="0" width="1.8" height="40" fill="currentColor" />
                        <rect x="4" y="0" width="3.6" height="40" fill="currentColor" />
                        {/* Symmetrical curves meeting on the 3rd line (y = 20) */}
                        <path d="M 8 0 C 12 0, 18 4, 15 14 C 13 17, 8 20, 8 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M 8 40 C 12 40, 18 36, 15 26 C 13 23, 8 20, 8 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                        {/* Decorative dots in the center areas representing the surrounding spaces */}
                        <circle cx="11.5" cy="10" r="1.5" fill="currentColor" />
                        <circle cx="11.5" cy="30" r="1.5" fill="currentColor" />
                      </g>
                    ) : (
                      /* Treble Clef Clave de Sol Vector */
                      <g transform="translate(15, 20) scale(1.15)">
                        <path d="M 12 55 C 8 51, 8 43, 14 39 C 20 35, 18 25, 14 18 C 11 13, 10 3, 14 1 C 15 0, 16 2, 16 5 C 15 10, 11 18, 14 28 C 15 33, 19 36, 18 43 C 17 50, 12 53, 9 50 C 7 48, 8 43, 10 41 C 12 40, 13 42, 12 44 C 11 46, 12 47, 13 46" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="13" cy="46" r="1.5" fill="currentColor" />
                      </g>
                    )}

                    {/* Time signature (Stylized fraction) */}
                    {parsedCompasso.length === 2 ? (
                      <g>
                        <text x="56" y="54" className="font-serif font-black text-sm" fill="currentColor" textAnchor="middle">{topNum}</text>
                        <text x="56" y="74" className="font-serif font-black text-sm" fill="currentColor" textAnchor="middle">{bottomNum}</text>
                      </g>
                    ) : (
                      <text x="56" y="64" className="font-serif font-black text-xs" fill="currentColor" textAnchor="middle">
                        {compasso || '4/4'}
                      </text>
                    )}
                  </svg>

                  {/* Scrollable Note Interactive Sheet */}
                  <svg
                    className={`h-full ml-[80px] text-slate-800 dark:text-white ${isReadOnly ? '' : 'cursor-pointer'}`}
                    style={{ width: `${unscaledLineNotesSvgWidth}px` }}
                    onClick={() => handleAddNote(lineIdx)}
                    onMouseMove={(e) => handleStaffMouseMove(e, lineIdx)}
                    onMouseLeave={handleStaffMouseLeave}
                  >
                    {/* Draw 5 Horizontal Staff Lines across all width */}
                    <line x1="0" y1="40" x2="100%" y2="40" stroke="currentColor" strokeWidth="1" className="opacity-40" />
                    <line x1="0" y1="50" x2="100%" y2="50" stroke="currentColor" strokeWidth="1" className="opacity-40" />
                    <line x1="0" y1="60" x2="100%" y2="60" stroke="currentColor" strokeWidth="1" className="opacity-40" />
                    <line x1="0" y1="70" x2="100%" y2="70" stroke="currentColor" strokeWidth="1" className="opacity-40" />
                    <line x1="0" y1="80" x2="100%" y2="80" stroke="currentColor" strokeWidth="1" className="opacity-40" />

                    {/* Draw placed notes for this line */}
                    {lineNotes.map((note, index) => {
                      const noteX = 30 + index * 48;
                      return (
                        <g key={note.id} className="relative group">
                          {/* Ghost selection highlight */}
                          <circle cx={noteX} cy="60" r="22" className="ghost-highlight fill-transparent stroke-transparent hover:fill-blue-500/5 group-hover:stroke-blue-500/20 active:fill-blue-500/10 cursor-pointer transition-colors" strokeWidth="1" />
                          
                          {/* The Note Body */}
                          <g transform={`translate(${noteX}, 0)`}>
                            {renderNoteHeadSVG(note.type, false, note.pitchLine, note.accidental)}

                            {/* Display note pitch label below the note */}
                            {!note.type.startsWith('pausa_') && pitchDetails[note.pitchLine] && (
                              <text 
                                x="0" 
                                y="118" 
                                className="font-mono text-[8px] font-bold text-slate-400 dark:text-slate-500 text-center" 
                                textAnchor="middle"
                              >
                                {pitchDetails[note.pitchLine].label}
                                {note.accidental === 'sharp' ? '#' : note.accidental === 'flat' ? 'b' : ''}
                              </text>
                            )}
                          </g>

                          {/* Simple Delete Button Icon on Hover for edits */}
                          {!isReadOnly && (
                            <g 
                              transform={`translate(${noteX}, 14)`} 
                              className="delete-button-group opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                              onClick={(e) => handleRemoveNote(note.id, e)}
                            >
                              <circle cx="0" cy="0" r="7" className="fill-red-500 hover:fill-red-600 transition-colors" />
                              <line x1="-3" y1="-3" x2="3" y2="3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                              <line x1="3" y1="-3" x2="-3" y2="3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Hover Ghost Note Preview on this line */}
                    {!isReadOnly && currentHoveredPitch !== null && (
                      <g transform={`translate(${30 + lineNotes.length * 48}, 0)`} className="ghost-preview">
                        {renderNoteHeadSVG(selectedFigure, true, currentHoveredPitch, selectedAccidental)}
                        {/* Ledger lines when outside */}
                        {currentHoveredPitch === 0 && (
                          <line x1="-12" y1={getYForPitchLine(0)} x2="12" y2={getYForPitchLine(0)} stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1" className="opacity-50" />
                        )}
                        {currentHoveredPitch === 12 && (
                          <line x1="-12" y1={getYForPitchLine(12)} x2="12" y2={getYForPitchLine(12)} stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1" className="opacity-50" />
                        )}
                      </g>
                    )}
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Empty state instruction on the sheet */}
        {!isReadOnly && notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none empty-state-pauta">
            <div className="bg-slate-50/90 dark:bg-dark-surface/90 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Clique na pauta para desenhar as notas! Adicione linhas de som no painel acima.</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Editing Toolbars (Omitted in Read Only mode) */}
      {!isReadOnly && (
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-dark-border">
          {/* Note Selection Figures (Sons) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Figuras de Som (Notas rítmicas)</span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {[
                { id: 'semibreve', symbol: '𝅝', label: 'Semibreve' },
                { id: 'minima', symbol: '𝅗𝅥', label: 'Mínima' },
                { id: 'seminima', symbol: '𝅘𝅥', label: 'Semínima' },
                { id: 'colcheia', symbol: '𝅘𝅥𝅮', label: 'Colcheia' },
                { id: 'semicolcheia', symbol: '𝅘𝅥𝅯', label: 'Semicolch.' },
                { id: 'fusa', symbol: '𝅘𝅥𝅰', label: 'Fusa' },
                { id: 'semifusa', symbol: '𝅘𝅥𝅱', label: 'Semifusa' }
              ].map(fig => (
                <button
                  key={fig.id}
                  type="button"
                  onClick={() => setSelectedFigure(fig.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    selectedFigure === fig.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                      : 'bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  <span className="text-2xl leading-none h-6 font-serif">{fig.symbol}</span>
                  <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter leading-none">{fig.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pause Selection Figures (Silenciosos) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Figuras de Pausa (Silêncio)</span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {[
                { id: 'pausa_semibreve', symbol: '𝄻', label: 'P.Semibreve' },
                { id: 'pausa_minima', symbol: '𝄼', label: 'P.Mínima' },
                { id: 'pausa_seminima', symbol: '𝄽', label: 'P.Semínima' },
                { id: 'pausa_colcheia', symbol: '𝄾', label: 'P.Colcheia' },
                { id: 'pausa_semicolcheia', symbol: '𝄿', label: 'P.Semicolch.' },
                { id: 'pausa_fusa', symbol: '𝅀', label: 'P.Fusa' },
                { id: 'pausa_semifusa', symbol: '𝅁', label: 'P.Semifusa' }
              ].map(fig => (
                <button
                  key={fig.id}
                  type="button"
                  onClick={() => setSelectedFigure(fig.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    selectedFigure === fig.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                      : 'bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  <span className="text-xl leading-none h-6 font-serif">{fig.symbol}</span>
                  <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter leading-none">{fig.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accidentals Palette */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Acidentes Musicais (Somente para Notas)</span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'none', symbol: '∅', label: 'Nenhum' },
                { id: 'sharp', symbol: '♯', label: 'Sustenido' },
                { id: 'flat', symbol: '♭', label: 'Bemol' },
                { id: 'natural', symbol: '♮', label: 'Bequadro' }
              ].map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccidental(acc.id as any)}
                  disabled={selectedFigure.startsWith('pausa_')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all disabled:opacity-30 ${
                    selectedAccidental === acc.id && !selectedFigure.startsWith('pausa_')
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  <span className="text-sm font-sans">{acc.symbol}</span>
                  <span className="text-[10px] uppercase tracking-wider">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guide Help Box on Composers Mode */}
      {!isReadOnly && (
        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-2 text-[10px] text-blue-800 dark:text-blue-300 leading-relaxed font-bold">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
          <p>
            Escolha uma **figura rítmica** ou **pausa** no painel de ferramentas, selecione um **acidente** se necessário, repouse o mouse sobre a **pauta de 5 linhas** para ver a visualização prévia da nota (altura em Dó, Ré, Mi...) e **clique para desenhar**. As notas serão salvas no roteiro litúrgico.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  Music, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Layers, 
  Loader2, 
  BookOpen, 
  Share2,
  Calendar,
  Clock,
  MapPin
} from 'lucide-react';
import { AgendaItem, Canto } from '../types';
import { chordProToAligned, transposeChordPro, chordProToLyricsOnly } from '../lib/chordPro';
import { NOTE_MAP } from '../constants';
import { generateFolhetoPDF, getOrderedRepertoire } from '../lib/pdfGenerator';

interface FolhetoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda: AgendaItem | null;
  cantos: Canto[];
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function FolhetoModal({
  isOpen,
  onClose,
  agenda,
  cantos,
  showNotification
}: FolhetoModalProps) {
  const [mode, setMode] = useState<'lyrics' | 'chords'>('lyrics');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !agenda) return null;

  const repertoire = getOrderedRepertoire(agenda, cantos);

  // Format Date in Portuguese
  let dateFormatted = agenda.data;
  try {
    const d = new Date(agenda.data);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    }
  } catch (e) {
    // Keep original
  }

  // Handle PDF Download
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      generateFolhetoPDF({
        agenda,
        cantos,
        mode
      });
      showNotification(`PDF do Folheto (${mode === 'chords' ? 'Letras + Cifras' : 'Somente Letras'}) gerado com sucesso!`, 'success');
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      showNotification('Não foi possível gerar o PDF no momento.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Print with styled sheet
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 dark:bg-slate-950 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full">
        
        {/* MODAL CONTROLS HEADER (Hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 print:hidden">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-500/10 text-blue-400">
                  <FileText className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  MODO FOLHETO LITÚRGICO
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {agenda.titulo} • {repertoire.length} {repertoire.length === 1 ? 'música' : 'músicas'} no repertório
              </p>
            </div>
          </div>

          {/* Mode Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Mode Switch: Somente Letras vs Letras + Cifras */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                id="btn-folheto-mode-lyrics"
                onClick={() => setMode('lyrics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'lyrics'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Somente Letras
              </button>

              <button
                id="btn-folheto-mode-chords"
                onClick={() => setMode('chords')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'chords'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                Letras + Cifras
              </button>
            </div>

            {/* Print Button */}
            <button
              id="btn-print-folheto"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95"
              title="Imprimir folheto diretamente na impressora"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Download PDF Button */}
            <button
              id="btn-download-pdf-folheto"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Baixar arquivo PDF formatado para celular ou computador"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* FOLHETO PREVIEW CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/60 font-sans print:p-0 print:overflow-visible print:bg-white">
          
          {/* Simulated A4 Sheet */}
          <div className="max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl p-6 sm:p-10 border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0 print:max-w-none">
            
            {/* Sheet Liturgical Header */}
            <div className="border-b-2 border-slate-900 pb-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest uppercase text-blue-800">
                  GESTÃO LITÚRGICA DIGITAL
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {mode === 'chords' ? 'Folheto com Cifras' : 'Folheto de Cantos'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                {agenda.titulo}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-semibold pt-1">
                <span>📍 {agenda.local || 'Paróquia'}</span>
                <span>📅 {dateFormatted}</span>
                {agenda.season && <span>🕊️ {agenda.season}</span>}
              </div>

              {/* Escala if present */}
              {agenda.escala && agenda.escala.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  <strong className="text-slate-800">Escala de Músicos: </strong>
                  {agenda.escala.map(e => `${e.funcao}: ${e.nome}`).join('  •  ')}
                </div>
              )}
            </div>

            {/* Empty state */}
            {repertoire.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic text-sm">
                Nenhum canto adicionado a esta celebração.
              </div>
            )}

            {/* Repertoire Songs List */}
            <div className="space-y-6">
              {repertoire.map(({ item, song }, index) => {
                const targetKey = item.tom || song.tom || 'C';

                // Transpose chords or clean lyrics
                let displayText = song.letra || '';
                if (mode === 'chords') {
                  if (song.tom && targetKey && song.tom !== targetKey) {
                    const origIdx = NOTE_MAP[song.tom.replace(/m.*/, '')];
                    const targetIdx = NOTE_MAP[targetKey.replace(/m.*/, '')];
                    if (origIdx !== undefined && targetIdx !== undefined) {
                      const offset = (targetIdx - origIdx + 12) % 12;
                      displayText = transposeChordPro(displayText, offset, song.tom);
                    }
                  }
                  displayText = chordProToAligned(displayText);
                } else {
                  displayText = chordProToLyricsOnly(displayText);
                }

                const lines = displayText.split('\n');

                return (
                  <div 
                    key={`${song.id}-${index}`} 
                    className="space-y-2 border-b border-slate-100 pb-5 last:border-none print:break-inside-avoid"
                  >
                    
                    {/* Song Header */}
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                          {index + 1}. [{item.momento || song.tipo || 'Momento'}] — {song.nome}
                        </h3>
                        {song.artista && (
                          <p className="text-[11px] text-slate-500 font-medium">
                            {song.artista} {song.compositor ? `• ${song.compositor}` : ''}
                          </p>
                        )}
                      </div>

                      {mode === 'chords' && (
                        <span className="px-2.5 py-1 bg-blue-700 text-white rounded-lg text-xs font-black shrink-0 shadow-xs">
                          TOM: {targetKey}
                        </span>
                      )}
                    </div>

                    {/* Song Content */}
                    <div className={`pt-1 font-mono leading-relaxed whitespace-pre-wrap ${
                      mode === 'chords' ? 'text-xs text-slate-800' : 'font-sans text-xs sm:text-sm text-slate-800 leading-normal'
                    }`}>
                      {lines.map((line, lIdx) => {
                        const trimmed = line.trim();
                        if (!trimmed) {
                          return <div key={lIdx} className="h-2" />;
                        }

                        // Section tags like [Refrão], [Verso 1]
                        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                          return (
                            <div 
                              key={lIdx} 
                              className="font-bold text-blue-900 pt-1 pb-0.5 text-xs uppercase tracking-wider"
                            >
                              {trimmed}
                            </div>
                          );
                        }

                        if (mode === 'chords') {
                          const isChordLine = /^[A-G][#b]?(?:m|maj|dim|aug|sus|add|[0-9]|\/|\s)+$/.test(trimmed);
                          return (
                            <div 
                              key={lIdx} 
                              className={isChordLine ? 'font-bold text-blue-700 select-all' : 'text-slate-900'}
                            >
                              {line}
                            </div>
                          );
                        } else {
                          return (
                            <div key={lIdx} className="text-slate-800">
                              {line}
                            </div>
                          );
                        }
                      })}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Sheet Footer */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Gestão Litúrgica Digital • {agenda.titulo} • Modo {mode === 'chords' ? 'Letras e Cifras' : 'Somente Letras'}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

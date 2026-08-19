/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { AgendaItem, Canto, RepertorioItem } from '../types';
import { chordProToAligned, transposeChordPro, chordProToLyricsOnly } from './chordPro';
import { NOTE_MAP } from '../constants';

export interface GenerateFolhetoOptions {
  agenda: AgendaItem;
  cantos: Canto[];
  mode: 'lyrics' | 'chords'; // 'lyrics' = Somente Letras, 'chords' = Letras + Cifras
  columns?: 1 | 2;
  fontSize?: 'normal' | 'large' | 'compact';
}

/**
 * Faz o download seguro e compatível com Mobile (Android, iOS Safari, PWA) e Desktop
 */
export function triggerPdfDownload(doc: jsPDF, filename: string): void {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    
    // Check for iOS / mobile browser compatibility
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      // In iOS Safari, opening directly allows saving/sharing to Books/Files
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback: standard save
        doc.save(filename);
      }
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
    }
  } catch (err) {
    console.warn("Fallback para doc.save:", err);
    doc.save(filename);
  }
}

/**
 * Deduplica e ordena a lista de cantos da celebração de forma canônica
 */
export function getOrderedRepertoire(agenda: AgendaItem, cantos: Canto[]): { item: RepertorioItem; song: Canto }[] {
  const rawItems: RepertorioItem[] = agenda.repertorio && agenda.repertorio.length > 0
    ? agenda.repertorio
    : (agenda.cantosIds || []).map((cid, idx) => {
        const found = cantos.find(c => String(c.id) === String(cid));
        return {
          cantoId: cid,
          momento: found?.tipo || 'Momento',
          tom: found?.tom || 'C',
          ordem: idx + 1
        };
      });

  const seenIds = new Set<string>();
  const result: { item: RepertorioItem; song: Canto }[] = [];

  rawItems.forEach((it, idx) => {
    const song = cantos.find(c => String(c.id) === String(it.cantoId));
    if (!song) return;

    // Strict deduplication key: song ID + sequence order to avoid accidental repeats
    const dedupeKey = `${song.id}_${it.ordem || idx}`;
    if (seenIds.has(dedupeKey)) return;
    seenIds.add(dedupeKey);

    result.push({ item: it, song });
  });

  return result;
}

/**
 * GERADOR DO MODO FOLHETO (Somente Letras OU Letras + Cifras)
 */
export function generateFolhetoPDF({
  agenda,
  cantos,
  mode = 'lyrics',
  columns = 1,
  fontSize = 'normal'
}: GenerateFolhetoOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

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

  // Draw Standard Page Header
  let currentPage = 1;
  const drawPageHeader = (pageNum: number) => {
    doc.setFillColor(mode === 'chords' ? 30 : 26, mode === 'chords' ? 58 : 54, mode === 'chords' ? 138 : 93); // Navy for chords, Slate/Indigo for lyrics
    doc.rect(margin, margin, contentWidth, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(agenda.titulo.toUpperCase(), margin + 5, margin + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const subtitle = `${agenda.local || 'Comunidade Paroquial'}  •  ${dateFormatted}${agenda.season ? `  •  ${agenda.season}` : ''}`;
    doc.text(subtitle, margin + 5, margin + 13);

    // Tag Mode
    const modeTag = mode === 'chords' ? 'FOLHETO COM CIFRAS' : 'FOLHETO DE CANTOS';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(modeTag, pageWidth - margin - 5, margin + 7, { align: 'right' });
    doc.text(`Pág. ${pageNum}`, pageWidth - margin - 5, margin + 13, { align: 'right' });
  };

  // Draw Page Footer
  const drawPageFooter = (pageNum: number) => {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Gestão Litúrgica Digital • ${agenda.titulo} • ${mode === 'chords' ? 'Modo Cifras' : 'Modo Letras'}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  };

  // Render first page header
  drawPageHeader(currentPage);
  let y = margin + 24;

  // Escala info on top of page 1 if present
  if (agenda.escala && agenda.escala.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'S');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ESCALA DE MÚSICOS:', margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const escalaText = agenda.escala.map(e => `${e.funcao}: ${e.nome}`).join('   •   ');
    const escalaLines = doc.splitTextToSize(escalaText, contentWidth - 6);
    doc.text(escalaLines, margin + 3, y + 9.5);

    y += 18;
  }

  // Get ordered & deduplicated songs
  const repertoire = getOrderedRepertoire(agenda, cantos);

  if (repertoire.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Nenhuma música selecionada para este repertório.', margin + 5, y + 10);
    drawPageFooter(currentPage);
    const filename = `Folheto_${mode === 'chords' ? 'Cifras' : 'Letras'}_${agenda.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    triggerPdfDownload(doc, filename);
    return doc;
  }

  // Process and print each song
  repertoire.forEach(({ item, song }, index) => {
    const songIndexNum = index + 1;
    const momentoName = (item.momento || song.tipo || 'Momento').toUpperCase();
    const songTitle = song.nome.toUpperCase();
    const targetKey = item.tom || song.tom || 'C';

    // Transpose text if chord mode and keys differ
    let processedText = song.letra || '';
    if (mode === 'chords') {
      if (song.tom && targetKey && song.tom !== targetKey) {
        const origIdx = NOTE_MAP[song.tom.replace(/m.*/, '')];
        const targetIdx = NOTE_MAP[targetKey.replace(/m.*/, '')];
        if (origIdx !== undefined && targetIdx !== undefined) {
          const offset = (targetIdx - origIdx + 12) % 12;
          processedText = transposeChordPro(processedText, offset, song.tom);
        }
      }
      processedText = chordProToAligned(processedText);
    } else {
      // Lyrics-only mode: clean chords entirely
      processedText = chordProToLyricsOnly(processedText);
    }

    const songLines = processedText.split('\n');

    // Calculate approximate height needed for this song to prevent orphan headers
    const estimatedHeight = 12 + songLines.length * 4.2;

    // If remaining space is small (< 35mm) and song won't fit on this page, add page first
    if (y > pageHeight - 35) {
      drawPageFooter(currentPage);
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      y = margin + 24;
    }

    // Song Header Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.5, 1.5, 'S');

    // Moment & Title
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${songIndexNum}. ${momentoName} — ${songTitle}`, margin + 3, y + 5.5);

    // Key Tag (shown for both or chords mode)
    if (mode === 'chords') {
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(pageWidth - margin - 22, y + 1.5, 19, 5.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`TOM: ${targetKey}`, pageWidth - margin - 12.5, y + 5.2, { align: 'center' });
    } else if (song.artista) {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(song.artista.substring(0, 30), pageWidth - margin - 3, y + 5.5, { align: 'right' });
    }

    y += 12;

    // Render Song Lines
    songLines.forEach(line => {
      // Check page boundary
      if (y > pageHeight - 18) {
        drawPageFooter(currentPage);
        doc.addPage();
        currentPage++;
        drawPageHeader(currentPage);
        y = margin + 24;

        // Continuation marker
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`(continuação: ${songIndexNum}. ${songTitle})`, margin + 3, y);
        y += 6;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        y += 3;
        return;
      }

      // Check section header like [Refrão], [Verso 1], [Intro]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(mode === 'chords' ? 30 : 79, mode === 'chords' ? 58 : 70, mode === 'chords' ? 138 : 229); // navy or indigo
        doc.text(trimmed, margin + 2, y);
        y += 4.5;
        return;
      }

      if (mode === 'chords') {
        // Check if chord line
        const isChordLine = /^[A-G][#b]?(?:m|maj|dim|aug|sus|add|[0-9]|\/|\s)+$/.test(trimmed);
        if (isChordLine) {
          doc.setTextColor(37, 99, 235); // Blue for chords
          doc.setFont('courier', 'bold');
          doc.setFontSize(8.5);
        } else {
          doc.setTextColor(15, 23, 42); // Slate for lyrics
          doc.setFont('courier', 'normal');
          doc.setFontSize(8.5);
        }
        doc.text(line, margin + 2, y);
        y += 4;
      } else {
        // Somente Letras Mode: Helvetica clean text
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(line, margin + 3, y);
        y += 4.5;
      }
    });

    // Space after song
    y += 5;
  });

  // Draw footer on final page
  drawPageFooter(currentPage);

  const filename = `Folheto_${mode === 'chords' ? 'Cifras' : 'Letras'}_${agenda.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  triggerPdfDownload(doc, filename);

  return doc;
}

/**
 * Backward-compatible Repertoire PDF Generator
 */
export function generateRepertoirePDF({ type, agenda, cantos }: { type: 'summary' | 'full'; agenda: AgendaItem; cantos: Canto[] }) {
  if (type === 'summary') {
    return generateFolhetoPDF({
      agenda,
      cantos,
      mode: 'lyrics'
    });
  } else {
    return generateFolhetoPDF({
      agenda,
      cantos,
      mode: 'chords'
    });
  }
}

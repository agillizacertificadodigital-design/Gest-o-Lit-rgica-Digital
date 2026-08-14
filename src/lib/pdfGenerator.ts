/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { AgendaItem, Canto } from '../types';
import { transposeText } from './chordPro';
import { chordProToAligned, transposeChordPro } from './chordPro';
import { NOTE_MAP } from '../constants';

interface GeneratePdfOptions {
  type: 'summary' | 'full';
  agenda: AgendaItem;
  cantos: Canto[];
}

export function generateRepertoirePDF({ type, agenda, cantos }: GeneratePdfOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Format Date and Time
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
      // Capitalize first letter
      dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    }
  } catch (e) {
    // Keep original
  }

  // Helper: Draw Header Box
  const drawHeader = (isCover = false) => {
    doc.setFillColor(30, 58, 138); // Dark Navy Blue
    doc.rect(margin, margin, contentWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('GESTÃO LITÚRGICA DIGITAL', margin + 6, margin + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(agenda.titulo || 'Celebração Litúrgica', margin + 6, margin + 15);

    doc.setFontSize(8);
    doc.text(`${agenda.local || 'Paróquia'} | ${dateFormatted}`, pageWidth - margin - 6, margin + 15, { align: 'right' });
  };

  if (type === 'summary') {
    // SUMMARY VIEW (1 page or compact)
    drawHeader(true);

    let y = margin + 30;

    // Musician scale section if exists
    if (agenda.escala && agenda.escala.length > 0) {
      doc.setFillColor(241, 245, 249); // light slate
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ESCALA DO MINISTÉRIO DE MÚSICA:', margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const escalaTexts = agenda.escala.map(e => `${e.funcao}: ${e.nome}`).join('   •   ');
      const lines = doc.splitTextToSize(escalaTexts, contentWidth - 8);
      doc.text(lines, margin + 4, y + 13);

      y += 30;
    }

    // Repertoire Table Header
    doc.setFillColor(51, 65, 85);
    doc.rect(margin, y, contentWidth, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    doc.text('MOMENTO', margin + 4, y + 5.5);
    doc.text('MÚSICA / CANTO', margin + 42, y + 5.5);
    doc.text('TOM', pageWidth - margin - 35, y + 5.5);
    doc.text('RITMO / OBS', pageWidth - margin - 4, y + 5.5, { align: 'right' });

    y += 8;

    // Build Repertoire list
    const items = agenda.repertorio && agenda.repertorio.length > 0
      ? agenda.repertorio
      : (agenda.cantosIds || []).map((cid, idx) => ({
          cantoId: cid,
          momento: cantos.find(c => String(c.id) === String(cid))?.tipo || 'Momento',
          tom: cantos.find(c => String(c.id) === String(cid))?.tom || 'C',
          observacao: '',
          ordem: idx + 1
        }));

    items.forEach((item, idx) => {
      const song = cantos.find(c => String(c.id) === String(item.cantoId));
      if (!song) return;

      const rowHeight = 9;
      // Alternate row colors
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(item.momento || song.tipo || '—', margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      const songTitle = song.nome + (song.artista ? ` (${song.artista})` : '');
      doc.text(songTitle.length > 40 ? songTitle.substring(0, 38) + '...' : songTitle, margin + 42, y + 6);

      // Key (Highlight in blue if customized)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(item.tom || song.tom || '—', pageWidth - margin - 35, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const rhythmText = [song.bpm ? `${song.bpm} BPM` : '', song.compasso || '', item.observacao || ''].filter(Boolean).join(' • ');
      doc.text(rhythmText, pageWidth - margin - 4, y + 6, { align: 'right' });

      y += rowHeight;

      if (y > pageHeight - 25) {
        doc.addPage();
        drawHeader();
        y = margin + 30;
      }
    });

    // Footer note
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.text('Gerado pelo Gestão Litúrgica Digital • Uso exclusivo para ministérios de música litúrgica', pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`Repertorio_Resumo_${agenda.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    return;
  }

  // FULL CHORD SHEET PDF
  // Page 1: Cover & Index
  drawHeader(true);
  let y = margin + 30;

  // Celebration Info Card
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(agenda.titulo, margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Data: ${dateFormatted}`, margin + 6, y + 17);
  doc.text(`Local: ${agenda.local || 'Comunidade Paroquial'}`, margin + 6, y + 23);
  if (agenda.tipoCelebracao) {
    doc.text(`Tipo: ${agenda.tipoCelebracao}`, margin + 6, y + 29);
  }

  y += 42;

  // Escala
  if (agenda.escala && agenda.escala.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 58, 138);
    doc.text('ESCALA DE MÚSICOS E MINISTROS:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    agenda.escala.forEach((esc, idx) => {
      doc.text(`• ${esc.funcao}: ${esc.nome}`, margin + 4, y);
      y += 5;
    });

    y += 5;
  }

  // Song Index Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('ÍNDICE DO REPERTÓRIO:', margin, y);
  y += 6;

  const repertoireItems = agenda.repertorio && agenda.repertorio.length > 0
    ? agenda.repertorio
    : (agenda.cantosIds || []).map((cid, idx) => ({
        cantoId: cid,
        momento: cantos.find(c => String(c.id) === String(cid))?.tipo || 'Momento',
        tom: cantos.find(c => String(c.id) === String(cid))?.tom || 'C',
        ordem: idx + 1
      }));

  repertoireItems.forEach((item, idx) => {
    const song = cantos.find(c => String(c.id) === String(item.cantoId));
    if (!song) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${idx + 1}. [${item.momento || song.tipo}]`, margin + 4, y);

    doc.setFont('helvetica', 'normal');
    doc.text(song.nome, margin + 45, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Tom: ${item.tom || song.tom || '—'}`, pageWidth - margin - 30, y);

    y += 6;
  });

  // Now append each song on its own page(s)
  repertoireItems.forEach((item, songIdx) => {
    const song = cantos.find(c => String(c.id) === String(item.cantoId));
    if (!song) return;

    doc.addPage();
    let currentY = margin;

    // Header for this song
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, currentY, contentWidth, 14, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${songIdx + 1}. ${song.nome.toUpperCase()}`, margin + 5, currentY + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const subtitle = [item.momento || song.tipo, song.artista, song.bpm ? `${song.bpm} BPM` : '', song.compasso].filter(Boolean).join(' • ');
    doc.text(subtitle, margin + 5, currentY + 11);

    // Chosen Key Tag
    const songKey = item.tom || song.tom || 'C';
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 24, currentY + 3, 20, 8, 2, 2, 'F');
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`TOM: ${songKey}`, pageWidth - margin - 14, currentY + 8.5, { align: 'center' });

    currentY += 20;

    // Transpose lyrics according to celebration tone if needed
    let textToRender = song.letra || '';
    if (song.tom && songKey && song.tom !== songKey) {
      const origIdx = NOTE_MAP[song.tom.replace(/m.*/, '')];
      const targetIdx = NOTE_MAP[songKey.replace(/m.*/, '')];
      if (origIdx !== undefined && targetIdx !== undefined) {
        const offset = (targetIdx - origIdx + 12) % 12;
        textToRender = transposeChordPro(textToRender, offset, song.tom);
      }
    }

    // Convert to aligned text if it contains ChordPro
    const alignedText = chordProToAligned(textToRender);
    const lines = alignedText.split('\n');

    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);

    lines.forEach(line => {
      if (currentY > pageHeight - 16) {
        doc.addPage();
        currentY = margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${song.nome} (continuação) - Tom: ${songKey}`, margin, currentY);
        currentY += 8;
        doc.setFont('courier', 'normal');
        doc.setFontSize(8.5);
      }

      const trimmed = line.trim();
      if (!trimmed) {
        currentY += 3.5;
        return;
      }

      // Check section header
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text(trimmed, margin, currentY);
        currentY += 5.5;
        doc.setFont('courier', 'normal');
        doc.setFontSize(8.5);
        return;
      }

      // Check if chord line
      const isChord = /^[A-G][#b]?(?:m|maj|dim|aug|sus|add|[0-9]|\/|\s)+$/.test(trimmed);
      if (isChord) {
        doc.setTextColor(37, 99, 235); // Blue for chords
        doc.setFont('courier', 'bold');
      } else {
        doc.setTextColor(15, 23, 42); // Dark slate for lyrics
        doc.setFont('courier', 'normal');
      }

      doc.text(line, margin, currentY);
      currentY += 4.2;
    });
  });

  doc.save(`Repertorio_Cifras_${agenda.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

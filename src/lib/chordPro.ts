/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NOTES_SHARP, NOTES_FLAT, NOTE_MAP } from '../constants';

export interface ChordProLine {
  type: 'section' | 'chord-lyrics' | 'comment' | 'empty';
  sectionName?: string;
  items?: { chord?: string; text: string }[];
  rawText?: string;
}

export interface ParsedSong {
  title?: string;
  artist?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  lines: ChordProLine[];
  rawChordPro: string;
}

// Regex to capture chords including jazz/complex notations and slash chords
export const CHORD_REGEX = /(?<![a-zA-ZÀ-ÿ])[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?(?:\/[a-gA-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|M|alt|°|ø|Δ|▵|[#b]|[\+\-ªº|])*(?:\([^\)]*\))?)?(?![a-zA-ZÀ-ÿ])|(?<=\s|^)[|:/\-_\\[\]┌┐└┘─│~^]+(?=\s|$)/g;

/**
 * Circle of fifths & key signature preference:
 * Keys that standardly use flats: F (1b), Bb (2b), Eb (3b), Ab (4b), Db (5b), Gb (6b), Dm, Gm, Cm, Fm, Bbm, Ebm
 */
export function getAccidentalPreference(targetKey?: string): 'sharp' | 'flat' {
  if (!targetKey) return 'sharp';
  const clean = targetKey.match(/^[A-G][#b]?/i)?.[0] || 'C';
  const idx = NOTE_MAP[clean];
  if (idx === undefined) return 'sharp';
  
  // Indices: 5 (F), 10 (Bb/A#), 3 (Eb/D#), 8 (Ab/G#), 1 (Db/C#), 6 (Gb/F#)
  const flatIndices = [5, 10, 3, 8, 1, 6];
  return flatIndices.includes(idx) ? 'flat' : 'sharp';
}

/**
 * Transpose a single chord string by a semitone offset
 */
export function transposeChord(chord: string, semitones: number, preference?: 'sharp' | 'flat'): string {
  if (semitones === 0 || !chord) return chord;

  const notesList = preference === 'flat' ? NOTES_FLAT : NOTES_SHARP;

  const transposeSinglePart = (singleChord: string) => {
    const rootMatch = singleChord.match(/^[A-G][#b]?/i);
    if (!rootMatch) return singleChord;
    
    const root = rootMatch[0];
    const rest = singleChord.slice(root.length);
    
    // Normalize root capitalization (e.g. "c#" -> "C#", "bb" -> "Bb")
    const formattedRoot = root.charAt(0).toUpperCase() + (root.length > 1 ? root.charAt(1) : '');
    let rootIndex = NOTE_MAP[formattedRoot];
    if (rootIndex === undefined) return singleChord;
    
    let newIndex = (rootIndex + semitones + 1200) % 12;
    return notesList[newIndex] + rest;
  };

  if (chord.includes('/')) {
    const parts = chord.split('/');
    return `${transposeSinglePart(parts[0])}/${transposeSinglePart(parts[1])}`;
  }

  return transposeSinglePart(chord);
}

/**
 * Converts standard two-line sheet (chords line above lyrics line) or mixed text into ChordPro format.
 */
export function textToChordPro(text: string): string {
  if (!text) return '';

  // Check if it already contains ChordPro brackets e.g. [G] or {title:
  if (/\[[A-G][#b]?[^\]]*\]/.test(text) && !text.includes('\n[G]')) {
    // If it already uses embedded brackets inside lyrics, return normalized
    return text;
  }

  const lines = text.split('\n');
  const result: string[] = [];

  const isChordLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) return false;

    const commonWords = /\b(a|o|e|é|do|da|de|que|com|se|um|em|os|as|paz|meu|teu|sua|seu|por|nós|para|senhor|deus|cristo|jesus|maria|amém|louvor)\b/i;
    if (commonWords.test(trimmed)) return false;

    const matches = Array.from(trimmed.matchAll(CHORD_REGEX)).map(m => m[0]);
    if (matches.length === 0) return false;

    const matchedChars = matches.reduce((acc, m) => acc + m.length, 0);
    const nonSpaceChars = trimmed.replace(/\s/g, '').length;
    return matchedChars / nonSpaceChars >= 0.6;
  };

  const isSectionHeader = (line: string): boolean => {
    const trimmed = line.trim();
    return /^(\[|\()(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estrofe|coda|inst|fim|pre-refrão|parte)(.*)(\]|\))$/i.test(trimmed)
      || /^(\[?[A-ZÀ-ÿ\s0-9]+\]?)$/i.test(trimmed) && (trimmed.startsWith('[') || trimmed.length < 25 && /intro|refrão|verso|ponte|final|solo/i.test(trimmed));
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // Section header
    if (isSectionHeader(trimmed)) {
      const cleanHeader = trimmed.replace(/^[\(\[]|[\)\]]$/g, '').trim();
      const formatted = cleanHeader.charAt(0).toUpperCase() + cleanHeader.slice(1);
      result.push(`[${formatted}]`);
      continue;
    }

    // Check if current line is chord line and next line is lyrics
    if (isChordLine(line)) {
      const nextLine = lines[i + 1] || '';
      
      if (!isChordLine(nextLine) && !isSectionHeader(nextLine) && nextLine.trim() !== '') {
        // Merge chords into lyrics
        const chordMatches = Array.from(line.matchAll(CHORD_REGEX));
        let merged = '';
        let lastLyricsIdx = 0;

        chordMatches.forEach(match => {
          const chord = match[0];
          const chordCol = match.index || 0;

          if (chordCol > lastLyricsIdx) {
            merged += nextLine.slice(lastLyricsIdx, chordCol);
            lastLyricsIdx = chordCol;
          }
          merged += `[${chord}]`;
        });

        if (lastLyricsIdx < nextLine.length) {
          merged += nextLine.slice(lastLyricsIdx);
        }

        result.push(merged);
        i++; // Skip the next line as it was merged
      } else {
        // Standalone chord line (e.g. Intro: G D Em C)
        const chordMatches = Array.from(line.matchAll(CHORD_REGEX));
        let out = '';
        chordMatches.forEach(m => {
          out += `[${m[0]}] `;
        });
        result.push(out.trim());
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Transpose a full ChordPro formatted or plaintext song
 */
export function transposeChordPro(chordProText: string, semitones: number, originalKey?: string, explicitPref?: 'sharp' | 'flat'): string {
  if (semitones === 0 || !chordProText) return chordProText;

  const pref = explicitPref || getAccidentalPreference(
    originalKey ? transposeChord(originalKey, semitones) : undefined
  );

  // If text contains [Chord] brackets
  if (/\[[A-G][#b]?[^\]]*\]/i.test(chordProText)) {
    return chordProText.replace(/\[([A-G][#b]?[^\]]*)\]/g, (_, chord) => {
      return `[${transposeChord(chord, semitones, pref)}]`;
    });
  }

  // Fallback for standard text lines
  const lines = chordProText.split('\n');
  const chordRegex = CHORD_REGEX;

  return lines.map(line => {
    // Check if line is chord line
    const matches = Array.from(line.matchAll(chordRegex));
    if (matches.length === 0) return line;

    let result = '';
    let lastIdx = 0;

    for (const match of matches) {
      const full = match[0];
      const idx = match.index!;
      result += line.substring(lastIdx, idx);
      
      if (/^[A-G]/i.test(full)) {
        result += transposeChord(full, semitones, pref);
      } else {
        result += full;
      }
      lastIdx = idx + full.length;
    }
    result += line.substring(lastIdx);
    return result;
  }).join('\n');
}

/**
 * Converts ChordPro syntax back to aligned 2-line chords/lyrics format for traditional sheet rendering or print.
 */
/**
 * Parse plain text with chords into structured chord lines or ChordPro string
 */
export function parseChordsFromText(text: string): { chords: string[]; chordPro: string; rawText: string } {
  const chordPro = textToChordPro(text);
  const chordsFound: string[] = [];
  const matches = Array.from(text.matchAll(CHORD_REGEX));
  matches.forEach(m => {
    const c = m[0].trim();
    if (c && /^[A-G]/i.test(c) && !chordsFound.includes(c)) {
      chordsFound.push(c);
    }
  });
  return { chords: chordsFound, chordPro, rawText: text };
}

export function transposeText(text: string, semitones: number, originalKey?: string): string {
  return transposeChordPro(text, semitones, originalKey);
}

export function chordProToAligned(chordProText: string): string {
  if (!chordProText) return '';

  const lines = chordProText.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.includes('][')) {
      result.push(trimmed);
      continue;
    }

    if (!line.includes('[')) {
      result.push(line);
      continue;
    }

    let chordLine = '';
    let lyricsLine = '';
    let curLyricsLen = 0;

    const parts = line.split(/(\[[^\]]+\])/);

    for (const part of parts) {
      if (part.startsWith('[') && part.endsWith(']')) {
        const chord = part.slice(1, -1);
        while (chordLine.length < curLyricsLen) {
          chordLine += ' ';
        }
        chordLine += chord;
      } else {
        lyricsLine += part;
        curLyricsLen = lyricsLine.length;
      }
    }

    if (chordLine.trim()) {
      result.push(chordLine);
    }
    if (lyricsLine.trim()) {
      result.push(lyricsLine);
    }
  }

  return result.join('\n');
}

/**
 * Extrai somente a letra limpa de um texto com cifras ou ChordPro,
 * preservando a ordem das estrofes, refrão e cabeçalhos de seção.
 */
export function chordProToLyricsOnly(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const result: string[] = [];

  const isPureChordLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Se for cabeçalho de seção [Refrão], [Verso], etc., não é linha de acordes
    if (/^\[(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estrofe|coda|inst|fim|pre-refrão|parte)[^\]]*\]$/i.test(trimmed)) {
      return false;
    }
    const cleanNoBrackets = trimmed.replace(/[\[\]]/g, ' ').trim();
    const tokens = cleanNoBrackets.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    
    // Se a maioria dos tokens forem acordes conhecidos
    const chordCount = tokens.filter(t => /^[A-G][#b]?(?:m|maj|dim|aug|sus|add|[0-9]|\/|°|ø|Δ)*/.test(t)).length;
    return chordCount / tokens.length >= 0.6;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // Se for seção ex: [Refrão], [Verso 1]
    if (/^\[(intro|refrão|bridge|ponte|verse|verso|final|outro|solo|interlúdio|coro|estrofe|coda|inst|fim|pre-refrão|parte)[^\]]*\]$/i.test(trimmed)) {
      result.push(trimmed);
      continue;
    }

    // Se for linha de acordes puros
    if (isPureChordLine(line)) {
      continue;
    }

    // Remove acordes embutidos em colchetes [G], [D/F#], etc., mas NÃO remove seções litúrgicas
    const cleanLine = line.replace(/\[([A-G][#b]?[^\]]*)\]/g, '').trimEnd();
    if (cleanLine.trim()) {
      result.push(cleanLine);
    }
  }

  return result.join('\n');
}


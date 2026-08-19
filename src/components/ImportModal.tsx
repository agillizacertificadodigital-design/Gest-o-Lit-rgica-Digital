/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  Image as ImageIcon, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  Music, 
  Layers,
  ArrowRight,
  FileCode,
  FileType
} from 'lucide-react';
import { Canto, SeasonInfo } from '../types';
import { NOTES_SHARP } from '../constants';
import { parseChordsFromText } from '../lib/chordPro';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCanto: (cantoData: Partial<Canto>) => void;
  existingCantos: Canto[];
  categorias: string[];
  temposLiturgicos: SeasonInfo[];
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ImportModal({
  isOpen,
  onClose,
  onSaveCanto,
  existingCantos,
  categorias,
  temposLiturgicos,
  showNotification
}: ImportModalProps) {
  
  const [importTab, setImportTab] = useState<'file' | 'text' | 'image'>('file');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Loading state
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Form Fields for review & saving
  const [nome, setNome] = useState('');
  const [artista, setArtista] = useState('');
  const [compositor, setCompositor] = useState('');
  const [tom, setTom] = useState('C');
  const [bpm, setBpm] = useState<number | ''>('');
  const [compasso, setCompasso] = useState('4/4');
  const [tipo, setTipo] = useState('Entrada');
  const [season, setSeason] = useState('Tempo Comum');
  const [ano, setAno] = useState('Geral');
  const [letra, setLetra] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Step in modal: 1 = Input, 2 = Review & Confirm
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  // Duplicate detection
  const duplicateMatch = existingCantos.find(c => 
    c.nome.trim().toLowerCase() === nome.trim().toLowerCase()
  );

  // Handle File upload (.pdf, .docx, .doc, .txt, .chordpro)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    if (!nome) setNome(fileNameWithoutExt);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFileBase64(result);

      // If it's a plain text file, also populate rawText for quick preview
      if (file.name.endsWith('.txt') || file.name.endsWith('.chordpro') || file.name.endsWith('.cho') || file.name.endsWith('.cpro')) {
        const textReader = new FileReader();
        textReader.onload = (tEvent) => {
          setRawText(tEvent.target?.result as string || '');
        };
        textReader.readAsText(file);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Image upload for OCR
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setFileBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // AI Parse from Document (PDF, Word, TXT, ChordPro)
  const handleProcessFileWithAi = async () => {
    if (!fileBase64 && !rawText.trim()) {
      showNotification('Selecione um arquivo PDF, Word ou de texto primeiro.', 'info');
      return;
    }

    setIsProcessingAi(true);
    setStatusMessage('Lendo e analisando partitura/documento com Maestro IA...');

    try {
      const response = await fetch('/api/ai/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: fileBase64 || `data:text/plain;base64,${btoa(unescape(encodeURIComponent(rawText)))}`,
          fileName: selectedFile?.name || 'cifra.txt',
          mimeType: selectedFile?.type || 'application/octet-stream'
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao processar arquivo com IA.');
      }

      const data = await response.json();
      if (data.nome) setNome(data.nome);
      if (data.artista) setArtista(data.artista);
      if (data.compositor) setCompositor(data.compositor);
      if (data.tom) setTom(data.tom);
      if (data.bpm) setBpm(data.bpm);
      if (data.compasso) setCompasso(data.compasso);
      if (data.tipo && categorias.includes(data.tipo)) setTipo(data.tipo);
      if (data.season) setSeason(data.season);
      if (data.ano) setAno(data.ano);
      setLetra(data.letraFormatada || rawText);

      setStep(2);
      showNotification(`Arquivo "${selectedFile?.name || 'cifra'}" analisado com sucesso!`, 'success');
    } catch (err: any) {
      console.warn("Erro no processamento IA de documento:", err);
      // Fallback: advance to review
      if (rawText) setLetra(rawText);
      setStep(2);
      showNotification('Avançado para conferência manual.', 'info');
    } finally {
      setIsProcessingAi(false);
      setStatusMessage('');
    }
  };

  // AI Parse from Text
  const handleProcessTextWithAi = async () => {
    if (!rawText.trim()) {
      showNotification('Cole ou digite a cifra/letra primeiro.', 'info');
      return;
    }

    setIsProcessingAi(true);
    setStatusMessage('Estruturando harmonia e seções...');

    try {
      const response = await fetch('/api/ai/parse-chord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });

      if (!response.ok) {
        throw new Error('Falha ao processar texto com IA.');
      }

      const data = await response.json();
      if (data.nome) setNome(data.nome);
      if (data.artista) setArtista(data.artista);
      if (data.compositor) setCompositor(data.compositor);
      if (data.tom) setTom(data.tom);
      if (data.bpm) setBpm(data.bpm);
      if (data.compasso) setCompasso(data.compasso);
      if (data.tipo && categorias.includes(data.tipo)) setTipo(data.tipo);
      if (data.season) setSeason(data.season);
      if (data.ano) setAno(data.ano);
      setLetra(data.letraFormatada || rawText);

      setStep(2);
      showNotification('Cifra analisada e estruturada com sucesso pela IA!', 'success');
    } catch (err: any) {
      // Fallback: advance to review with raw text
      setLetra(rawText);
      setStep(2);
      showNotification('Avançado para revisão manual.', 'info');
    } finally {
      setIsProcessingAi(false);
      setStatusMessage('');
    }
  };

  // AI OCR from Image
  const handleProcessImageWithAi = async () => {
    if (!imagePreview && !fileBase64) {
      showNotification('Selecione uma imagem de partitura ou cifra primeiro.', 'info');
      return;
    }

    setIsProcessingAi(true);
    setStatusMessage('Reconhecendo partitura/imagem com IA...');

    try {
      const response = await fetch('/api/ai/ocr-chord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imagePreview || fileBase64 })
      });

      if (!response.ok) {
        throw new Error('Falha no reconhecimento da imagem.');
      }

      const data = await response.json();
      if (data.nome) setNome(data.nome);
      if (data.artista) setArtista(data.artista);
      if (data.compositor) setCompositor(data.compositor);
      if (data.tom) setTom(data.tom);
      if (data.bpm) setBpm(data.bpm);
      if (data.compasso) setCompasso(data.compasso);
      if (data.tipo && categorias.includes(data.tipo)) setTipo(data.tipo);
      if (data.season) setSeason(data.season);
      if (data.ano) setAno(data.ano);
      setLetra(data.letraFormatada || '');

      setStep(2);
      showNotification('Imagem transcrita com sucesso!', 'success');
    } catch (err: any) {
      showNotification('Não foi possível ler a imagem com IA no momento.', 'error');
    } finally {
      setIsProcessingAi(false);
      setStatusMessage('');
    }
  };

  // Save Final Song to Library
  const handleConfirmSave = () => {
    if (!nome.trim()) {
      showNotification('Por favor, informe o título da música.', 'error');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSaveCanto({
      nome: nome.trim(),
      artista: artista.trim(),
      compositor: compositor.trim(),
      tom: tom || 'C',
      bpm: bpm ? Number(bpm) : undefined,
      compasso: compasso || '4/4',
      tipo: tipo || 'Entrada',
      season: season || 'Tempo Comum',
      ano: (ano as 'A' | 'B' | 'C' | 'Geral') || 'Geral',
      letra: letra.trim(),
      tags,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    onClose();
    showNotification(`Música "${nome}" cadastrada com sucesso no acervo!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {step === 1 ? 'Importar Cifra ou Partitura' : 'Revisão & Cadastro da Cifra'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 1 ? 'Aceita arquivos PDF, Word (DOCX/DOC), ChordPro, Texto e Fotos' : 'Confira os dados antes de gravar no acervo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: INPUT SOURCE */}
        {step === 1 && (
          <div className="space-y-4">
            
            {/* Tabs: Upload Arquivo (PDF/Word/TXT) / Colar Texto / Imagem OCR */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              <button
                onClick={() => setImportTab('file')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importTab === 'file'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Arquivo (PDF / Word)
              </button>

              <button
                onClick={() => setImportTab('text')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importTab === 'text'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Colar Texto
              </button>

              <button
                onClick={() => setImportTab('image')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importTab === 'image'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Foto / Imagem
              </button>
            </div>

            {/* TAB: UPLOAD ARQUIVO (PDF, Word DOCX/DOC, TXT, ChordPro) */}
            {importTab === 'file' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Selecione o arquivo com a cifra ou partitura:
                  </label>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    <span>PDF • Word (.docx) • ChordPro • TXT</span>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-3 hover:border-blue-400 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex justify-center items-center gap-3 text-blue-600">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : 'Arraste ou clique para selecionar o arquivo'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Formatos aceitos: <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.doc</strong>, <strong>.chordpro</strong>, <strong>.txt</strong>, <strong>.cpro</strong>
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.chordpro,.cpro,.cho,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-chord-upload"
                  />
                  
                  <div className="pt-1">
                    <label
                      htmlFor="file-chord-upload"
                      className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      {selectedFile ? 'Trocar Arquivo' : 'Escolher Arquivo do Computador'}
                    </label>
                  </div>
                </div>

                {selectedFile && (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-black uppercase">
                      {selectedFile.name.split('.').pop() || 'Arquivo'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB: COLAR TEXTO */}
            {importTab === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cole a cifra ou letra aqui:
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Exemplo:&#10;[Intro] C G Am F&#10;&#10;C            G&#10;Senhor, quem entrará&#10;Am             F&#10;No vosso santuário?..."
                  rows={10}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* TAB: IMAGEM OCR */}
            {importTab === 'image' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Foto da folha de canto ou partitura:
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img 
                        src={imagePreview} 
                        alt="Prévia da cifra" 
                        className="max-h-48 mx-auto rounded-xl object-contain shadow-xs"
                      />
                      <button
                        onClick={() => { setImagePreview(null); setFileBase64(null); }}
                        className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                      >
                        Trocar Imagem
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">Tire uma foto nítida ou envie uma imagem (JPG/PNG)</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-chord-upload"
                      />
                      <label
                        htmlFor="image-chord-upload"
                        className="inline-block px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold cursor-pointer hover:bg-blue-100"
                      >
                        Selecionar Imagem
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Actions for Step 1 */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setLetra(rawText || '');
                  setStep(2);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Pular IA e Preencher Manualmente
              </button>

              <button
                id="btn-process-ai"
                disabled={
                  isProcessingAi || 
                  (importTab === 'file' && !selectedFile && !rawText.trim()) ||
                  (importTab === 'image' && !imagePreview) ||
                  (importTab === 'text' && !rawText.trim())
                }
                onClick={
                  importTab === 'file' 
                    ? handleProcessFileWithAi 
                    : importTab === 'image' 
                      ? handleProcessImageWithAi 
                      : handleProcessTextWithAi
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || 'Analisando com IA...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisar e Estruturar Arquivo</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: REVIEW & CONFIRM */}
        {step === 2 && (
          <div className="space-y-4">
            
            {/* Duplicate Warning if matched */}
            {duplicateMatch && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Aviso de Duplicidade:</strong> Já existe uma música cadastrada com o título "<strong>{duplicateMatch.nome}</strong>" (Tom: {duplicateMatch.tom}). Você pode alterar o título para diferenciá-la.
                </div>
              </div>
            )}

            {/* Form Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Título da Música: *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Como És Lindo"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Artista / Ministério:
                </label>
                <input
                  type="text"
                  value={artista}
                  onChange={(e) => setArtista(e.target.value)}
                  placeholder="Ex: Vida Reluz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Compositor:
                </label>
                <input
                  type="text"
                  value={compositor}
                  onChange={(e) => setCompositor(e.target.value)}
                  placeholder="Ex: Walmir Alencar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tom:
                  </label>
                  <select
                    value={tom}
                    onChange={(e) => setTom(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {NOTES_SHARP.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    BPM:
                  </label>
                  <input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value ? Number(e.target.value) : '')}
                    placeholder="80"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Compasso:
                  </label>
                  <select
                    value={compasso}
                    onChange={(e) => setCompasso(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['4/4', '3/4', '6/8', '2/4', '12/8', '2/2'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Momento Litúrgico:
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categorias.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tempo Litúrgico:
                  </label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {temposLiturgicos.map(t => (
                      <option key={t.id} value={t.label || t.id}>{t.label || t.id}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ano:
                  </label>
                  <select
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['Geral', 'A', 'B', 'C'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Letra / Cifra Editor */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cifra Estruturada:
                </label>
                <span className="text-[11px] text-slate-400">
                  Tags de seções como [Intro], [Verso], [Refrão], [Final]
                </span>
              </div>
              <textarea
                value={letra}
                onChange={(e) => setLetra(e.target.value)}
                rows={8}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tags Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tags (separadas por vírgula):
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="liturgia, comunhão, adoração, maria"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions for Step 2 */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Voltar
              </button>

              <button
                id="btn-confirm-save-canto"
                onClick={handleConfirmSave}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Gravar no Acervo</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

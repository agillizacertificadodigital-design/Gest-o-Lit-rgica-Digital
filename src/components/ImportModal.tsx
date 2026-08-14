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
  ArrowRight
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
  
  const [importTab, setImportTab] = useState<'text' | 'file' | 'image'>('text');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Loading state
  const [isProcessingAi, setIsProcessingAi] = useState(false);

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

  // Handle File upload (.txt / .chordpro)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      // Auto extract title from filename if empty
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      if (!nome) setNome(fileNameWithoutExt);
    };
    reader.readAsText(file);
  };

  // Handle Image upload for OCR
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // AI Parse from Text
  const handleProcessTextWithAi = async () => {
    if (!rawText.trim()) {
      showNotification('Cole ou digite a cifra/letra primeiro.', 'info');
      return;
    }

    setIsProcessingAi(true);
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
    }
  };

  // AI OCR from Image
  const handleProcessImageWithAi = async () => {
    if (!imagePreview) {
      showNotification('Selecione uma imagem de partitura ou cifra primeiro.', 'info');
      return;
    }

    setIsProcessingAi(true);
    try {
      const response = await fetch('/api/ai/ocr-chord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imagePreview })
      });

      if (!response.ok) {
        throw new Error('Falha no reconhecimento da imagem.');
      }

      const data = await response.json();
      if (data.nome) setNome(data.nome);
      if (data.artista) setArtista(data.artista);
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
      artista: artista.trim() || 'Católico',
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
                {step === 1 ? 'Insira o texto, arquivo ou foto para detecção automática' : 'Confira os dados antes de gravar no acervo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: INPUT SOURCE */}
        {step === 1 && (
          <div className="space-y-4">
            
            {/* Tabs: Colar Texto / Upload Arquivo / Imagem OCR */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
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
                onClick={() => setImportTab('file')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importTab === 'file'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Arquivo (.txt/.cpro)
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

            {/* TAB: UPLOAD ARQUIVO */}
            {importTab === 'file' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Carregar arquivo de texto (.txt, .chordpro, .cpro):
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-2 hover:border-blue-400 transition-colors">
                  <UploadCloud className="w-8 h-8 text-blue-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedFile ? selectedFile.name : 'Clique para selecionar o arquivo ou arraste até aqui'}
                  </p>
                  <input
                    type="file"
                    accept=".txt,.chordpro,.cpro,.cho"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-chord-upload"
                  />
                  <label
                    htmlFor="file-chord-upload"
                    className="inline-block px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold cursor-pointer hover:bg-blue-100"
                  >
                    Escolher Arquivo
                  </label>
                </div>
                {rawText && (
                  <p className="text-[11px] text-emerald-600 font-bold">
                    ✓ Conteúdo carregado ({rawText.length} caracteres).
                  </p>
                )}
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
                        onClick={() => setImagePreview(null)}
                        className="text-xs text-rose-500 font-bold hover:underline"
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
                  setLetra(rawText);
                  setStep(2);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Pular IA e Preencher Manualmente
              </button>

              <button
                id="btn-process-ai"
                disabled={isProcessingAi || (importTab === 'image' ? !imagePreview : !rawText.trim())}
                onClick={importTab === 'image' ? handleProcessImageWithAi : handleProcessTextWithAi}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisar e Estruturar</span>
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Momento Litúrgico:
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tempo Litúrgico:
                </label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {temposLiturgicos.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tom Original:
                </label>
                <select
                  value={tom}
                  onChange={(e) => setTom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400"
                >
                  {NOTES_SHARP.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    BPM:
                  </label>
                  <input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex: 85"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ano:
                  </label>
                  <select
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Geral">Geral</option>
                    <option value="A">Ano A</option>
                    <option value="B">Ano B</option>
                    <option value="C">Ano C</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cifra Content Box */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cifra Formatada:
              </label>
              <textarea
                value={letra}
                onChange={(e) => setLetra(e.target.value)}
                rows={8}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {/* Step 2 Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100"
              >
                Voltar
              </button>

              <button
                id="btn-save-imported-canto"
                onClick={handleConfirmSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Salvar no Acervo Musical
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

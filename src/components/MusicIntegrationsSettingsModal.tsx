/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Globe, 
  Check, 
  Sliders, 
  ShieldCheck, 
  FolderPlus, 
  Upload, 
  Trash2, 
  Key, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Radio,
  FileCode,
  Music,
  RefreshCw,
  Layers,
  Lock
} from 'lucide-react';
import { musicProviderRegistry } from '../lib/providers/providerRegistry';
import { OpenSongProvider, OpenSongItem } from '../lib/providers/openSongProvider';
import { MusicProviderInfo } from '../types/providers';

interface MusicIntegrationsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProvidersChanged?: () => void;
}

export const MusicIntegrationsSettingsModal: React.FC<MusicIntegrationsSettingsModalProps> = ({
  isOpen,
  onClose,
  onProvidersChanged
}) => {
  const [providers, setProviders] = useState<MusicProviderInfo[]>(musicProviderRegistry.getProviders());
  const [activeTab, setActiveTab] = useState<'overview' | 'opensong' | 'planning_center' | 'songselect'>('overview');
  
  // OpenSong State
  const [openSongFilesCount, setOpenSongFilesCount] = useState<number>(
    musicProviderRegistry.openSongProvider.getSongCount()
  );
  const [openSongUploadMsg, setOpenSongUploadMsg] = useState<string>('');

  // Planning Center State
  const [pcoAppId, setPcoAppId] = useState<string>('');
  const [pcoSecret, setPcoSecret] = useState<string>('');
  const [pcoOrg, setPcoOrg] = useState<string>(musicProviderRegistry.planningCenterProvider.getOrganizationName() || '');
  const [isPcoConnected, setIsPcoConnected] = useState<boolean>(
    musicProviderRegistry.planningCenterProvider.isConnected()
  );

  // SongSelect State
  const [ccliLicense, setCcliLicense] = useState<string>('');

  if (!isOpen) return null;

  const refreshProviders = () => {
    const updated = musicProviderRegistry.getProviders();
    setProviders(updated);
    setOpenSongFilesCount(musicProviderRegistry.openSongProvider.getSongCount());
    setIsPcoConnected(musicProviderRegistry.planningCenterProvider.isConnected());
    if (onProvidersChanged) onProvidersChanged();
  };

  const handleToggleProvider = (id: string, currentEnabled: boolean) => {
    musicProviderRegistry.setProviderEnabled(id, !currentEnabled);
    refreshProviders();
  };

  // OpenSong XML Upload Handler
  const handleOpenSongFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setOpenSongUploadMsg(`Processando ${files.length} arquivo(s) OpenSong...`);
    const parsedSongs: OpenSongItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const parsed = OpenSongProvider.parseOpenSongXml(text, `os_${file.name.replace(/\.[^/.]+$/, '')}`);
        if (parsed) {
          parsedSongs.push(parsed);
        }
      } catch (err) {
        console.warn(`Erro no arquivo ${file.name}:`, err);
      }
    }

    if (parsedSongs.length > 0) {
      musicProviderRegistry.openSongProvider.addMultipleSongs(parsedSongs);
      setOpenSongUploadMsg(`✓ ${parsedSongs.length} canto(s) OpenSong importado(s) com sucesso para o acervo local!`);
      refreshProviders();
    } else {
      setOpenSongUploadMsg('Nenhum canto válido no formato OpenSong XML foi identificado.');
    }
  };

  const handleClearOpenSong = () => {
    if (confirm('Tem certeza que deseja limpar todo o acervo OpenSong local importado?')) {
      musicProviderRegistry.openSongProvider.clearCatalog();
      setOpenSongUploadMsg('Acervo OpenSong limpo.');
      refreshProviders();
    }
  };

  // Planning Center Handlers
  const handleSavePco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pcoAppId.trim() || !pcoSecret.trim()) {
      alert('Preencha o Application ID e Secret do Planning Center.');
      return;
    }
    musicProviderRegistry.planningCenterProvider.setCredentials(pcoAppId, pcoSecret, pcoOrg);
    setIsPcoConnected(true);
    refreshProviders();
    alert('Credenciais do Planning Center Services salvas com sucesso!');
  };

  const handleDisconnectPco = () => {
    if (confirm('Deseja desconectar sua conta do Planning Center Services?')) {
      musicProviderRegistry.planningCenterProvider.disconnect();
      setPcoAppId('');
      setPcoSecret('');
      setPcoOrg('');
      setIsPcoConnected(false);
      refreshProviders();
    }
  };

  // SongSelect Handlers
  const handleSaveCcli = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccliLicense.trim()) {
      alert('Insira o número da licença CCLI.');
      return;
    }
    musicProviderRegistry.songSelectProvider.setLicense(ccliLicense);
    refreshProviders();
    alert(`Licença CCLI #${ccliLicense} configurada.`);
  };

  const connectedCount = musicProviderRegistry.getConnectedProvidersCount();

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Integrações & Bancos Musicais
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {connectedCount} Ativos
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gerencie provedores de áudio, metadados, letras e acervos de cifras do Gestão Litúrgica Digital.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/50 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Todos os Provedores ({providers.length})
          </button>
          <button
            onClick={() => setActiveTab('opensong')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'opensong'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            OpenSong Acervo ({openSongFilesCount})
          </button>
          <button
            onClick={() => setActiveTab('planning_center')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'planning_center'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Planning Center Services
          </button>
          <button
            onClick={() => setActiveTab('songselect')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'songselect'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            SongSelect / CCLI
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: OVERVIEW DE TODOS OS PROVEDORES */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Cada provedor desempenha um papel transparente na busca. Você pode habilitar ou desabilitar fontes individuais:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((p) => {
                  const isConfigured = p.status === 'online';
                  return (
                    <div 
                      key={p.id}
                      className={`p-4 rounded-xl border transition-all ${
                        p.enabled && isConfigured
                          ? 'bg-slate-900 border-slate-700/80 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-100">{p.name}</h4>
                            {p.status === 'online' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Conectado
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                                {p.id === 'opensong' ? 'Configurável' : 'Requer Configuração'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {p.description}
                          </p>
                        </div>

                        {/* Toggle switch */}
                        <button
                          onClick={() => handleToggleProvider(p.id, p.enabled)}
                          className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                            p.enabled && isConfigured ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                          }`}
                          title={p.enabled ? 'Desativar provedor' : 'Ativar provedor'}
                        >
                          <div className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            p.enabled && isConfigured ? 'bg-slate-950' : 'bg-slate-400'
                          }`} />
                        </button>
                      </div>

                      {/* Capabilities Matrix */}
                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="font-semibold text-slate-500">Recursos:</span>
                        <span className={p.capabilities.supportsMetadata ? 'text-emerald-400 font-medium' : 'text-slate-600'}>
                          {p.capabilities.supportsMetadata ? '✓' : '✕'} Catálogo
                        </span>
                        <span className={p.capabilities.supportsAudioPreview ? 'text-pink-400 font-medium' : 'text-slate-600'}>
                          {p.capabilities.supportsAudioPreview ? '✓' : '✕'} Áudio
                        </span>
                        <span className={p.capabilities.supportsLyrics ? 'text-blue-400 font-medium' : 'text-slate-600'}>
                          {p.capabilities.supportsLyrics ? '✓' : '✕'} Letra
                        </span>
                        <span className={p.capabilities.supportsChords ? 'text-amber-400 font-medium' : 'text-slate-600'}>
                          {p.capabilities.supportsChords ? '✓' : '✕'} Cifra
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: OPENSONG CONFIG */}
          {activeTab === 'opensong' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  Acervo OpenSong Local (Paróquia / Ministério)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O OpenSong é o padrão internacional para projeção e arquivamento de cânticos com cifras (`.xml` ou formato nativo OpenSong). Carregue aqui os arquivos da sua comunidade para pesquisar, transpor e importar automaticamente em formato ChordPro.
                </p>
              </div>

              <div className="p-6 bg-slate-950/80 border border-dashed border-slate-700 rounded-2xl text-center space-y-4">
                <FolderPlus className="w-10 h-10 text-amber-400 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-200">
                    Selecione arquivos de músicas OpenSong (.xml ou sem extensão)
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Você pode selecionar múltiplos arquivos simultaneamente da pasta Songs do OpenSong.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-md">
                  <Upload className="w-4 h-4" />
                  <span>Carregar Arquivos OpenSong</span>
                  <input
                    type="file"
                    multiple
                    accept=".xml,text/xml,text/plain"
                    onChange={handleOpenSongFileUpload}
                    className="hidden"
                  />
                </label>

                {openSongUploadMsg && (
                  <p className="text-xs font-semibold text-amber-300 mt-2 bg-amber-500/10 py-2 px-4 rounded-lg inline-block">
                    {openSongUploadMsg}
                  </p>
                )}
              </div>

              {/* Status and Clean action */}
              <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      Total de Músicas no Acervo OpenSong Local:
                    </span>
                    <span className="text-xs font-bold text-amber-400 ml-2">
                      {openSongFilesCount} canções indexadas
                    </span>
                  </div>
                </div>

                {openSongFilesCount > 0 && (
                  <button
                    onClick={handleClearOpenSong}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Acervo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PLANNING CENTER SERVICES */}
          {activeTab === 'planning_center' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Conexão com Planning Center Services
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conecte o seu Personal Access Token do Planning Center para sincronizar os repertórios, tonalidades, BPMs e arranjos cadastrados na sua conta ministerial.
                </p>
              </div>

              <form onSubmit={handleSavePco} className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Application ID (Personal Access Token)
                    </label>
                    <input
                      type="text"
                      value={pcoAppId}
                      onChange={(e) => setPcoAppId(e.target.value)}
                      placeholder="ex: 9b2d8f..."
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={pcoSecret}
                      onChange={(e) => setPcoSecret(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome da Organização / Ministério (Opcional)
                  </label>
                  <input
                    type="text"
                    value={pcoOrg}
                    onChange={(e) => setPcoOrg(e.target.value)}
                    placeholder="ex: Paróquia São José"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {isPcoConnected ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Conta Conectada
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Nenhuma conta conectada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isPcoConnected && (
                      <button
                        type="button"
                        onClick={handleDisconnectPco}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                      >
                        Desconectar
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md"
                    >
                      Salvar e Conectar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: SONGSELECT / CCLI */}
          {activeTab === 'songselect' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  SongSelect / CCLI (Licenciamento Internacional)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Estrutura preparada para importação de letras e chord charts autorizados via SongSelect CCLI. O acesso requer licença ativa da paróquia ou congregação.
                </p>
              </div>

              <form onSubmit={handleSaveCcli} className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Número da Licença CCLI / Paroquial
                  </label>
                  <input
                    type="text"
                    value={ccliLicense}
                    onChange={(e) => setCcliLicense(e.target.value)}
                    placeholder="ex: CCLI #1234567"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    Salvar Licença
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>O Gestão Litúrgica respeita as diretrizes de cada portal e provedor integrado.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
};

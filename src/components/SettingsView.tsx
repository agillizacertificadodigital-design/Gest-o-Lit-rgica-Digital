/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Mail, 
  Lock, 
  Save, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';
import { User as FirebaseUser, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { Canto, AgendaItem, SeasonInfo } from '../types';

interface SettingsViewProps {
  user: FirebaseUser | null;
  categorias: string[];
  setCategorias: (cats: string[]) => void;
  cantos: Canto[];
  agenda: AgendaItem[];
  temposLiturgicos: SeasonInfo[];
  onImportFullBackup: (data: { cantos?: Canto[]; agenda?: AgendaItem[]; categorias?: string[] }) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function SettingsView({
  user,
  categorias,
  setCategorias,
  cantos,
  agenda,
  temposLiturgicos,
  onImportFullBackup,
  isDarkMode,
  setIsDarkMode,
  showNotification
}: SettingsViewProps) {
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // New Category
  const [newCategoryName, setNewCategoryName] = useState('');

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      if (email && email !== user.email) {
        await updateEmail(user, email);
      }
      if (newPassword) {
        await updatePassword(user, newPassword);
        setNewPassword('');
      }
      showNotification('Perfil atualizado com sucesso!', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Falha ao atualizar perfil.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Add category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categorias.includes(newCategoryName.trim())) {
      showNotification('Esta categoria já existe.', 'info');
      return;
    }
    const updated = [...categorias, newCategoryName.trim()];
    setCategorias(updated);
    setNewCategoryName('');
    showNotification(`Categoria "${newCategoryName}" adicionada!`, 'success');
  };

  // Remove category
  const handleRemoveCategory = (cat: string) => {
    const updated = categorias.filter(c => c !== cat);
    setCategorias(updated);
    showNotification(`Categoria "${cat}" removida.`, 'info');
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const backupData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      cantos,
      agenda,
      categorias,
      temposLiturgicos
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestao_liturgica_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup completo exportado com sucesso!', 'success');
  };

  // Import JSON backup
  const handleFileBackupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.cantos || parsed.agenda) {
          onImportFullBackup(parsed);
          showNotification('Backup importado com sucesso!', 'success');
        } else {
          showNotification('Arquivo de backup inválido.', 'error');
        }
      } catch (err) {
        showNotification('Erro ao ler arquivo JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-slate-600 dark:text-slate-400" />
          Configurações & Perfil
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Gerencie suas preferências de usuário, momentos litúrgicos e cópias de segurança do acervo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Dados do Usuário
            </h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nome de Exibição:
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                E-mail:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nova Senha (deixe em branco se não for alterar):
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isUpdating ? 'Atualizando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        {/* Categorias / Momentos Litúrgicos Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Momentos Litúrgicos Personalizados
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Novo momento (ex: Louvor)"
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
            <button
              onClick={handleAddCategory}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Adicionar
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
            {categorias.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
              >
                {cat}
                <button
                  onClick={() => handleRemoveCategory(cat)}
                  className="text-slate-400 hover:text-rose-500 ml-1 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Backup & Restore Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Download className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-base text-slate-900 dark:text-white">
            Backup & Restauração do Acervo
          </h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Exporte uma cópia completa de segurança contendo todas as músicas, cifras, partituras, agendas de celebrações e configurações em formato JSON.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar Backup (.json)
          </button>

          <div>
            <input
              type="file"
              accept=".json"
              id="file-backup-upload"
              onChange={handleFileBackupChange}
              className="hidden"
            />
            <label
              htmlFor="file-backup-upload"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              Restaurar Backup
            </label>
          </div>
        </div>
      </div>

    </div>
  );
}

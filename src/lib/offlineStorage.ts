/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgendaItem, Canto } from '../types';

const OFFLINE_KEY_PREFIX = 'gld_offline_';
const OFFLINE_AGENDA_KEY = 'gld_offline_agenda';
const OFFLINE_CANTOS_KEY = 'gld_offline_cantos';
const OFFLINE_PACKAGES_KEY = 'gld_offline_packages';

export interface OfflineRepertoirePackage {
  celebrationId: string | number;
  savedAt: string;
  celebration: AgendaItem;
  cantos: { canto: Canto; tomUtilizado: string }[];
}

export function saveRepertoireOffline(celebration: AgendaItem, allCantos: Canto[]): OfflineRepertoirePackage {
  const celebrationCantos: { canto: Canto; tomUtilizado: string }[] = [];

  if (celebration.repertorio && celebration.repertorio.length > 0) {
    celebration.repertorio.forEach(item => {
      const found = allCantos.find(c => String(c.id) === String(item.cantoId));
      if (found) {
        celebrationCantos.push({
          canto: found,
          tomUtilizado: item.tom || found.tom || 'C'
        });
      }
    });
  } else if (celebration.cantosIds && celebration.cantosIds.length > 0) {
    celebration.cantosIds.forEach(id => {
      const found = allCantos.find(c => String(c.id) === String(id));
      if (found) {
        celebrationCantos.push({
          canto: found,
          tomUtilizado: found.tom || 'C'
        });
      }
    });
  }

  const pkg: OfflineRepertoirePackage = {
    celebrationId: celebration.id,
    savedAt: new Date().toISOString(),
    celebration,
    cantos: celebrationCantos
  };

  try {
    const existingPackages = getOfflinePackages();
    const filtered = existingPackages.filter(p => String(p.celebrationId) !== String(celebration.id));
    filtered.push(pkg);
    localStorage.setItem(OFFLINE_PACKAGES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save offline package:', err);
  }

  return pkg;
}

export function getOfflinePackages(): OfflineRepertoirePackage[] {
  try {
    const data = localStorage.getItem(OFFLINE_PACKAGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function getOfflinePackageById(celebrationId: string | number): OfflineRepertoirePackage | null {
  const packages = getOfflinePackages();
  return packages.find(p => String(p.celebrationId) === String(celebrationId)) || null;
}

export function removeOfflinePackage(celebrationId: string | number) {
  try {
    const existing = getOfflinePackages();
    const updated = existing.filter(p => String(p.celebrationId) !== String(celebrationId));
    localStorage.setItem(OFFLINE_PACKAGES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete offline package:', err);
  }
}

export function isRepertoireCachedOffline(celebrationId: string | number): boolean {
  const pkg = getOfflinePackageById(celebrationId);
  return !!pkg;
}

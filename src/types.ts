/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LiturgicalSeason = string;

export interface Canto {
  id: number;
  ano: 'A' | 'B' | 'C' | 'Geral';
  tipo: string; // Moment of the mass (e.g., Entrada, Glória)
  nome: string;
  letra: string;
  season: LiturgicalSeason;
  tom?: string;
  bpm?: number;
  compasso?: string;
}

export interface AgendaItem {
  id: number;
  titulo: string;
  local: string;
  data: string;
  recorrencia?: 'unica' | 'mensal' | 'anual';
  cantosIds?: number[];
}

export interface SeasonInfo {
  id: LiturgicalSeason;
  label: string;
  color: string;
  borderColor: string;
  description: string;
  icon: string;
}

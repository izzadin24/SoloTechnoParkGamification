export interface Zona {
  id: string;
  urutan: number;
  nama_id: string;
  nama_en: string;
  warna_tema: string;
}

export interface Checkpoint {
  id: string;
  zona_id: string;
  kode_qr: string;
  jenis_titik: string;
  status_akses: string;
  bonus: boolean;
  nama_id: string;
  nama_en: string;
  teaser_id: string;
  teaser_en: string;
  reveal_id: string;
  reveal_en: string;
  posisi_x: number;
  posisi_y: number;
}

export interface Kartu {
  id: string;
  checkpoint_id: string;
  tipe: string;
  ikon_url: string | null;
  tags: string[];
}

export interface Ide {
  id: string;
  nama_id: string;
  nama_en: string;
  ikon_url: string | null;
  tag_dibutuhkan: string[];
}

export interface GameData {
  zones: Zona[];
  checkpoints: Checkpoint[];
  cards: Kartu[];
  ideas: Ide[];
}

import { supabase } from './supabase';

export async function fetchGameData(): Promise<GameData> {
  const [
    { data: zones },
    { data: checkpoints },
    { data: cards },
    { data: ideas }
  ] = await Promise.all([
    supabase.from('zona').select('*'),
    supabase.from('checkpoint').select('*'),
    supabase.from('kartu').select('*'),
    supabase.from('ide').select('*'),
  ]);

  return {
    zones: zones || [],
    checkpoints: checkpoints || [],
    cards: cards || [],
    ideas: ideas || [],
  };
}


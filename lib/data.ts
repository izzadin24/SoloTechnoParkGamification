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
  deskripsi_id?: string;
  deskripsi_en?: string;
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

export const IDEA_DESCRIPTIONS: Record<string, { id: string; en: string }> = {
  'ide-01': {
    id: 'Alat Kesehatan Portabel memadukan teknologi sensor medis IoT, desain presisi 3D, analisis data riset, dan sertifikasi uji mutu untuk pemantauan kesehatan digital.',
    en: 'Portable Health Device combines IoT medical sensors, precision 3D design, research data analysis, and quality standards for digital health monitoring.'
  },
  'ide-02': {
    id: 'Aplikasi Logistik Desa berfokus pada arsitektur software cerdas, analisis data komoditas lokal, dan manajemen rantai pasok distribusi antar-desa.',
    en: 'Village Logistics App focuses on smart software architecture, local commodity data analytics, and inter-village supply chain management.'
  },
  'ide-03': {
    id: 'Kapal Nelayan Modern menggabungkan inovasi struktur komposit ramah lingkungan, sistem tenaga energi hijau, sertifikasi standar laut, dan manufaktur skala industri.',
    en: 'Modern Fishing Boat combines eco-friendly composite structures, green energy power systems, marine quality standards, and industrial manufacturing.'
  },
  'ide-04': {
    id: 'Produk UMKM Naik Kelas mengintegrasikan otomatisasi pabrikasi mini, manajemen distribusi gudang modern, dan strategi pemasaran digital untuk skala industri.',
    en: 'Upgraded SME Product integrates mini-factory assembly automation, modern warehouse logistics, and digital product marketing.'
  }
};

export function getIdeaDescription(idea: Ide | undefined | null, lang: 'id' | 'en'): string {
  if (!idea) return '';
  if (lang === 'id' && idea.deskripsi_id) return idea.deskripsi_id;
  if (lang === 'en' && idea.deskripsi_en) return idea.deskripsi_en;
  
  const fallback = IDEA_DESCRIPTIONS[idea.id];
  if (fallback) {
    return lang === 'id' ? fallback.id : fallback.en;
  }
  return lang === 'id' ? idea.nama_id : idea.nama_en;
}

export function getTargetCheckpointsForIdea(ideaId: string | null, gameData: GameData | null): Checkpoint[] {
  if (!ideaId || !gameData) return [];
  const idea = gameData.ideas.find((i) => i.id === ideaId);
  if (!idea || !idea.tag_dibutuhkan) return [];

  const matchingCardCheckpointIds = gameData.cards
    .filter((card) => card.tags && card.tags.some((tag) => idea.tag_dibutuhkan.includes(tag)))
    .map((card) => card.checkpoint_id);

  return gameData.checkpoints.filter((cp) => matchingCardCheckpointIds.includes(cp.id));
}


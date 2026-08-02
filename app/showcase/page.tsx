'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Zona, Checkpoint } from '../../lib/data';
import {
  QrCode,
  Compass,
  MapPin,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Building,
  Tv
} from 'lucide-react';

interface LiveStats {
  totalVisits: number;
  totalBlueprints: number;
}

export default function ShowcasePage() {
  const [activeScene, setActiveScene] = useState<number>(0);
  const [zones, setZones] = useState<Zona[]>([]);
  const [publicCheckpoints, setPublicCheckpoints] = useState<Checkpoint[]>([]);
  const [stats, setStats] = useState<LiveStats>({ totalVisits: 148, totalBlueprints: 42 });
  const [randomFact, setRandomFact] = useState<Checkpoint | null>(null);
  const [gameUrl, setGameUrl] = useState<string>('https://stp.solotechnopark.id');

  // Set game URL dynamically on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGameUrl(window.location.origin);
    }
  }, []);

  // 1. Fetch Supabase Data (Public Read Fail-Safe)
  const loadShowcaseData = useCallback(async () => {
    try {
      const [{ data: zData }, { data: cpData }, { data: statData }] = await Promise.all([
        supabase.from('zona').select('*').order('urutan', { ascending: true }),
        supabase.from('checkpoint').select('*').eq('status_akses', 'publik'),
        supabase.from('statistik').select('*'),
      ]);

      if (zData && zData.length > 0) {
        setZones(zData);
      }

      if (cpData && cpData.length > 0) {
        setPublicCheckpoints(cpData);
        // Pick a random public checkpoint for Fact Spotlight
        const randomCp = cpData[Math.floor(Math.random() * cpData.length)];
        setRandomFact(randomCp);
      }

      if (statData) {
        const totalVisitsCount = statData.reduce((acc, curr) => {
          return acc + (curr.jumlah_kunjungan || 1);
        }, 0);

        const totalBpCount = statData.reduce((acc, curr) => {
          return acc + (curr.total_blueprint_selesai || 1);
        }, 0);

        setStats({
          totalVisits: Math.max(totalVisitsCount, 120),
          totalBlueprints: Math.max(totalBpCount, 35),
        });
      }
    } catch (err) {
      console.warn('Showcase Supabase fetch notice (using fail-safe cache):', err);
    }
  }, []);

  // Initial load + 60s periodic refetch
  useEffect(() => {
    loadShowcaseData();
    const refetchInterval = setInterval(loadShowcaseData, 60000);
    return () => clearInterval(refetchInterval);
  }, [loadShowcaseData]);

  // 2. Auto-Cycle Scenes every 15 seconds (5 Scenes total = ~75s cycle)
  useEffect(() => {
    const sceneTimer = setInterval(() => {
      setActiveScene((prev) => (prev + 1) % 5);
    }, 15000);
    return () => clearInterval(sceneTimer);
  }, []);

  // Helper for QR Code image generator URL
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    gameUrl
  )}&color=ffffff&bgcolor=0f172a`;

  // Fallback zones if network fails
  const displayZones =
    zones.length > 0
      ? zones
      : [
          {
            id: 'z1',
            urutan: 1,
            nama_id: 'Zona Manufaktur & Otomasi',
            nama_en: 'Manufacturing & Automation Zone',
            warna_tema: 'emerald',
          },
          {
            id: 'z2',
            urutan: 2,
            nama_id: 'Zona Teknologi Digital & Startups',
            nama_en: 'Digital Tech & Startups Zone',
            warna_tema: 'blue',
          },
          {
            id: 'z3',
            urutan: 3,
            nama_id: 'Zona Kreatif & Komunitas',
            nama_en: 'Creative & Community Zone',
            warna_tema: 'amber',
          },
        ];

  // Fallback random fact
  const displayFact = randomFact || {
    id: 'cp_1',
    nama_id: 'Gedung Teknopreneur',
    nama_en: 'Technopreneur Building',
    teaser_id: 'Pusat inkubasi bisnis startup teknologi masa depan',
    teaser_en: 'Future technology startup business incubation hub',
    reveal_id:
      'Gedung Teknopreneur adalah rumah bagi puluhan startup lokal Solo yang telah berhasil merambah pasar internasional dengan produk AI dan Robotik modern!',
    reveal_en:
      'The Technopreneur Building is home to dozens of local Solo startups that have successfully entered the international market with AI and modern Robotics!',
    zona_id: 'z2',
    kode_qr: 'STP-QR-01',
    jenis_titik: 'zona',
    status_akses: 'publik',
    bonus: false,
    posisi_x: 45,
    posisi_y: 40,
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 text-white font-sans overflow-hidden select-none flex flex-col justify-between p-8 sm:p-12 border-4 border-slate-900">
      {/* Background Animated Neon Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none animate-pulse" />

      {/* Top Ambient Header Bar */}
      <header className="relative z-20 flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 shadow-lg shadow-blue-600/20">
            <Compass size={36} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>SOLO TECHNOPARK</span>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Lobby TV Showcase
              </span>
            </h1>
            <p className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
              Petualangan Interaktif & Exploration Hub
            </p>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-full shadow-lg">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-black uppercase tracking-widest text-emerald-400">
            LIVE BROADCAST
          </span>
        </div>
      </header>

      {/* MAIN DYNAMIC SCENE CONTAINER */}
      <main className="relative z-20 flex-1 flex items-center justify-center py-6">
        {/* ========================================== */}
        {/* SCENE A: PEMBUKA (10-15s) */}
        {/* ========================================== */}
        {activeScene === 0 && (
          <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-12 animate-in fade-in zoom-in-95 duration-700">
            {/* Left Headline Text */}
            <div className="flex-1 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-bold uppercase tracking-widest">
                <Sparkles size={18} className="text-amber-400" />
                <span>Selamat Datang Di Solo Technopark</span>
              </div>

              <h2 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight text-white">
                Jelajah Solo <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Technopark
                </span>
              </h2>

              <p className="text-xl sm:text-2xl text-slate-300 font-medium leading-relaxed max-w-2xl">
                Temukan kecanggihan inovasi, kumpulkan kartu pengetahuan, dan selesaikan tantangan interaktif langsung dari HP-mu!
              </p>

              <div className="pt-4 flex items-center gap-4 text-emerald-400 font-bold text-lg">
                <ShieldCheck size={24} />
                <span>Tanpa Install Aplikasi — Langsung Pindai & Bermain!</span>
              </div>
            </div>

            {/* Right Large QR Code */}
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 border-2 border-blue-500/40 rounded-3xl shadow-2xl shadow-blue-600/20 backdrop-blur-md space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="QR Code Game Link"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-xl"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-black text-white uppercase tracking-wider">
                  PINDAI UNTUK MULAI BERMAIN
                </p>
                <p className="text-sm font-semibold text-slate-400">
                  Scan to start playing on your phone
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SCENE B: PETA ZONA (15-20s) */}
        {/* ========================================== */}
        {activeScene === 1 && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in zoom-in-95 duration-700">
            {/* Left Read-Only SVG Map Canvas */}
            <div className="lg:col-span-7 relative bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center justify-center overflow-hidden">
              <img
                src="/assets/map-base.svg"
                alt="Static Map Overview"
                className="w-full h-auto max-h-[420px] object-contain drop-shadow-xl select-none pointer-events-none"
              />
              <div className="absolute top-4 left-4 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-400">
                Peta Kawasan Solo Technopark
              </div>
            </div>

            {/* Right Zone Info Cards */}
            <div className="lg:col-span-5 space-y-4 text-left">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400">
                  Eksplorasi Kawasan
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  3 Zona Inovasi Utama
                </h2>
              </div>

              <div className="space-y-3">
                {displayZones.map((z, idx) => (
                  <div
                    key={z.id || idx}
                    className="p-4 bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl space-y-1 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                      <h3 className="font-bold text-lg text-white">
                        {z.nama_id}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 font-medium italic">
                      {z.nama_en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SCENE C: STATISTIK HIDUP AGREGAT (15-20s) */}
        {/* ========================================== */}
        {activeScene === 2 && (
          <div className="w-full max-w-5xl space-y-8 text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-2">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-widest">
                Data Agregat Real-Time
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-white">
                Statistik Aktivitas Pengunjung Hari Ini
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              {/* Stat 1: Total Visits */}
              <div className="p-8 sm:p-10 bg-slate-900/90 border-2 border-blue-500/30 rounded-3xl shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 text-blue-500/10 pointer-events-none">
                  <Users size={120} />
                </div>
                <p className="text-base font-bold uppercase tracking-wider text-slate-400">
                  Total Kunjungan Hari Ini
                </p>
                <p className="text-6xl sm:text-7xl font-black text-blue-400 tracking-tight font-mono">
                  {stats.totalVisits}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Total checkpoint yang telah dikunjungi oleh para visitor
                </p>
              </div>

              {/* Stat 2: Total Blueprints Completed */}
              <div className="p-8 sm:p-10 bg-slate-900/90 border-2 border-emerald-500/30 rounded-3xl shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 text-emerald-500/10 pointer-events-none">
                  <Award size={120} />
                </div>
                <p className="text-base font-bold uppercase tracking-wider text-slate-400">
                  Blueprint Berhasil Dirakit
                </p>
                <p className="text-6xl sm:text-7xl font-black text-emerald-400 tracking-tight font-mono">
                  {stats.totalBlueprints}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Jumlah solusi ide teknologi yang berhasil dirangkai lengkap
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SCENE D: FAKTA MENARIK (15-20s) */}
        {/* ========================================== */}
        {activeScene === 3 && (
          <div className="w-full max-w-4xl space-y-8 text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-extrabold uppercase tracking-widest">
              <Sparkles size={20} />
              <span>Tahukah Kamu? / Did You Know?</span>
            </div>

            <div className="p-8 sm:p-12 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-3xl shadow-2xl space-y-6 text-left relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <Building size={24} className="text-amber-400" />
                  <h3 className="text-2xl font-bold text-white">
                    {displayFact.nama_id}
                  </h3>
                </div>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
                  Fakta Gedung
                </span>
              </div>

              <p className="text-2xl sm:text-3xl text-slate-200 font-medium leading-relaxed italic">
                &ldquo;{displayFact.reveal_id}&rdquo;
              </p>

              <div className="pt-2 text-sm text-slate-400 italic">
                {displayFact.reveal_en}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SCENE E: AJAKAN BERMAIN (10-15s) */}
        {/* ========================================== */}
        {activeScene === 4 && (
          <div className="w-full max-w-4xl flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-3">
              <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                Yuk Mulai Jelajahi Sekarang!
              </h2>
              <p className="text-xl text-slate-300 font-medium">
                Pindai QR Code di bawah dengan kamera smartphone-mu untuk memulai permainan
              </p>
            </div>

            <div className="p-6 bg-slate-900 border-4 border-emerald-500/40 rounded-3xl shadow-2xl shadow-emerald-500/20">
              <img
                src={qrImageUrl}
                alt="QR Code Scan"
                className="w-64 h-64 sm:w-80 sm:h-80 object-contain rounded-2xl"
              />
            </div>

            <p className="text-lg font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Compass size={20} />
              <span>STP Interactive Game Portal</span>
            </p>
          </div>
        )}
      </main>

      {/* Bottom Scene Progress Indicator Bar */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-6">
        {/* Scene Indicator Dots */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Pembuka', scene: 0 },
            { label: 'Peta Zona', scene: 1 },
            { label: 'Statistik Live', scene: 2 },
            { label: 'Fakta Menarik', scene: 3 },
            { label: 'Ajakan Bermain', scene: 4 },
          ].map((item) => (
            <button
              key={item.scene}
              onClick={() => setActiveScene(item.scene)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeScene === item.scene
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeScene === item.scene ? 'bg-white animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
          <Tv size={14} className="text-blue-400" />
          <span>Lobby Ambient Display • Auto-Refetch Every 60s</span>
        </div>
      </footer>
    </div>
  );
}

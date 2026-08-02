'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { Checkpoint, Zona, Kartu } from '../../../lib/data';
import {
  LogOut,
  Save,
  Trash2,
  X,
  Plus,
  Lock,
  Building,
  MapPin,
  CheckCircle2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Tag,
  CreditCard,
  Sliders,
  Crosshair,
  Maximize2,
  RefreshCw
} from 'lucide-react';

export default function AdminMapPage() {
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Map Data State
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [zones, setZones] = useState<Zona[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [cpForm, setCpForm] = useState<{
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
  }>({
    id: '',
    zona_id: 'z1',
    kode_qr: '',
    jenis_titik: 'zona',
    status_akses: 'publik',
    bonus: false,
    nama_id: '',
    nama_en: '',
    teaser_id: '',
    teaser_en: '',
    reveal_id: '',
    reveal_en: '',
    posisi_x: 50,
    posisi_y: 50,
  });

  const [kartuForm, setKartuForm] = useState<{
    id: string;
    tipe: string;
    tagsInput: string;
  }>({
    id: '',
    tipe: 'skill',
    tagsInput: 'Teknologi, Riset',
  });

  // Pan / Zoom & Touch State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const touchDistanceRef = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 1. Session check on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Map Data when session exists
  const loadMapData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [{ data: cpData }, { data: zData }] = await Promise.all([
        supabase.from('checkpoint').select('*').order('id'),
        supabase.from('zona').select('*').order('urutan', { ascending: true }),
      ]);

      if (cpData) setCheckpoints(cpData);
      if (zData) setZones(zData);
    } catch (err) {
      console.error('Failed loading map data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadMapData();
    }
  }, [session, loadMapData]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setLoginError('Email atau password salah');
    } catch (err) {
      setLoginError('Gagal melakukan login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Zoom Helpers (Max Zoom 6.0x for precision editing)
  const zoomIn = () => setScale((s) => Math.min(Number((s + 0.4).toFixed(1)), 6.0));
  const zoomOut = () => setScale((s) => Math.max(Number((s - 0.4).toFixed(1)), 0.8));
  const setPresetZoom = (z: number) => setScale(z);
  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 5) {
      hasMovedRef.current = true;
    }
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((s) => Math.min(Math.max(Number((s + zoomFactor).toFixed(1)), 0.8), 6.0));
  };

  // Touch Handlers for Mobile Devices (Single Finger Pan & Two Finger Pinch Zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      hasMovedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...pan };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      hasMovedRef.current = true;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 6) {
        hasMovedRef.current = true;
      }
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy,
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (currentDist - touchDistanceRef.current) * 0.006;
      setScale((s) => Math.min(Math.max(Number((s + delta).toFixed(1)), 0.8), 6.0));
      touchDistanceRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  // CLICK MAP TO CREATE PIN (Triggers only if not dragging/panning)
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return; // Ignore if user was panning/dragging
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const posX = Number(((offsetX / rect.width) * 100).toFixed(2));
    const posY = Number(((offsetY / rect.height) * 100).toFixed(2));

    const newId = `cp_${Date.now()}`;
    const newQr = `STP-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    setModalMode('create');
    setCpForm({
      id: newId,
      zona_id: zones[0]?.id || 'z1',
      kode_qr: newQr,
      jenis_titik: 'zona',
      status_akses: 'publik',
      bonus: false,
      nama_id: '',
      nama_en: '',
      teaser_id: '',
      teaser_en: '',
      reveal_id: '',
      reveal_en: '',
      posisi_x: posX,
      posisi_y: posY,
    });

    setKartuForm({
      id: `kartu_${Date.now()}`,
      tipe: 'skill',
      tagsInput: 'Teknologi, Inovasi',
    });

    setIsModalOpen(true);
  };

  // CLICK EXISTING PIN TO EDIT / DELETE
  const handlePinClick = async (e: React.MouseEvent, cp: Checkpoint) => {
    e.stopPropagation();

    setModalMode('edit');
    setCpForm({
      id: cp.id,
      zona_id: cp.zona_id || 'z1',
      kode_qr: cp.kode_qr || '',
      jenis_titik: cp.jenis_titik || 'zona',
      status_akses: cp.status_akses || 'publik',
      bonus: cp.bonus || false,
      nama_id: cp.nama_id || '',
      nama_en: cp.nama_en || '',
      teaser_id: cp.teaser_id || '',
      teaser_en: cp.teaser_en || '',
      reveal_id: cp.reveal_id || '',
      reveal_en: cp.reveal_en || '',
      posisi_x: cp.posisi_x ?? 50,
      posisi_y: cp.posisi_y ?? 50,
    });

    // Fetch linked kartu
    try {
      const { data: kartuData } = await supabase
        .from('kartu')
        .select('*')
        .eq('checkpoint_id', cp.id)
        .single();

      if (kartuData) {
        setKartuForm({
          id: kartuData.id,
          tipe: kartuData.tipe || 'skill',
          tagsInput: Array.isArray(kartuData.tags) ? kartuData.tags.join(', ') : '',
        });
      } else {
        setKartuForm({
          id: `kartu_${Date.now()}`,
          tipe: 'skill',
          tagsInput: '',
        });
      }
    } catch (err) {
      console.warn('Kartu not found or error:', err);
    }

    setIsModalOpen(true);
  };

  // SUBMIT FORM (CREATE / UPDATE)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tagsArray = kartuForm.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (modalMode === 'create') {
        // 1. Insert checkpoint
        const { error: cpErr } = await supabase.from('checkpoint').insert([cpForm]);
        if (cpErr) throw new Error(`Gagal membuat checkpoint: ${cpErr.message}`);

        // 2. Insert kartu
        const { error: kartuErr } = await supabase.from('kartu').insert([
          {
            id: kartuForm.id || `kartu_${Date.now()}`,
            checkpoint_id: cpForm.id,
            tipe: kartuForm.tipe,
            tags: tagsArray,
          },
        ]);
        if (kartuErr) console.warn('Peringatan simpan kartu:', kartuErr.message);

        setSaveSuccess('Checkpoint baru berhasil ditambahkan!');
      } else {
        // UPDATE
        const { error: cpErr } = await supabase
          .from('checkpoint')
          .update(cpForm)
          .eq('id', cpForm.id);
        if (cpErr) throw new Error(`Gagal update checkpoint: ${cpErr.message}`);

        const { error: kartuErr } = await supabase.from('kartu').upsert([
          {
            id: kartuForm.id || `kartu_${Date.now()}`,
            checkpoint_id: cpForm.id,
            tipe: kartuForm.tipe,
            tags: tagsArray,
          },
        ]);
        if (kartuErr) console.warn('Peringatan update kartu:', kartuErr.message);

        setSaveSuccess('Perubahan checkpoint berhasil disimpan!');
      }

      setIsModalOpen(false);
      await loadMapData();
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE PIN
  const handleDelete = async () => {
    if (!cpForm.id) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus checkpoint "${cpForm.nama_id}"?`)) return;

    setIsSubmitting(true);
    try {
      await supabase.from('kartu').delete().eq('checkpoint_id', cpForm.id);
      const { error } = await supabase.from('checkpoint').delete().eq('id', cpForm.id);

      if (error) throw error;

      setSaveSuccess('Checkpoint berhasil dihapus.');
      setIsModalOpen(false);
      await loadMapData();
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert('Gagal menghapus: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // LOGIN SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-bold">Admin Map Editor STP</h1>
            <p className="text-xs text-slate-400">Masuk untuk mengelola peta interaktif</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                placeholder="admin@solotechnopark.id"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {isLoggingIn ? 'Memproses...' : 'Masuk Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-100 flex flex-col select-none">
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed top-16 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 text-sm font-bold animate-in fade-in duration-200">
          <CheckCircle2 size={18} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Responsive Header Bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            title="Kembali ke Dashboard Admin"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-blue-400" />
              <span>Admin Map Visual Editor</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Tap / Klik area peta untuk pasang pin ({checkpoints.length} Pin Aktif)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMapData}
            disabled={isLoadingData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/map"
            target="_blank"
            className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>Visitor Map</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Floating Responsive Precision Zoom Toolbar (Mobile & Desktop) */}
      <div className="absolute right-3 top-20 z-30 flex flex-col items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-2xl">
        {/* Scale Percentage Indicator */}
        <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-black text-blue-400 tracking-wider">
          {Math.round(scale * 100)}%
        </div>

        {/* Zoom In (+) */}
        <button
          onClick={zoomIn}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white transition-all active:scale-90"
          title="Zoom In (+)"
        >
          <ZoomIn size={18} />
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={zoomOut}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white transition-all active:scale-90"
          title="Zoom Out (-)"
        >
          <ZoomOut size={18} />
        </button>

        <hr className="w-full border-slate-800 my-0.5" />

        {/* Quick Zoom Presets for High Precision Pinning */}
        <div className="flex flex-col gap-1 w-full">
          <button
            onClick={() => setPresetZoom(1.0)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
              scale === 1.0
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            1x
          </button>
          <button
            onClick={() => setPresetZoom(2.5)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
              scale === 2.5
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            2.5x
          </button>
          <button
            onClick={() => setPresetZoom(4.0)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
              scale === 4.0
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            4.0x
          </button>
          <button
            onClick={() => setPresetZoom(6.0)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
              scale === 6.0
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            6.0x
          </button>
        </div>

        <hr className="w-full border-slate-800 my-0.5" />

        {/* Re-center / Reset */}
        <button
          onClick={resetZoom}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-90"
          title="Reset Zoom & Pan"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Precision Helper Badge */}
      <div className="absolute left-3 top-20 z-30 pointer-events-none hidden sm:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-medium shadow-md">
        <Crosshair size={14} className="text-amber-400" />
        <span>Gunakan Zoom 4x/6x untuk memasang pin dengan presisi tinggi</span>
      </div>

      {/* Map Canvas with Mouse & Full Touch Gesture Handlers */}
      <div
        ref={mapContainerRef}
        className={`flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center ${
          isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative inline-block transition-transform duration-75 origin-center"
          style={{
            willChange: 'transform',
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
        >
          {/* Static SVG Map Background */}
          <div className="relative inline-block cursor-crosshair" onClick={handleMapClick}>
            <img
              src="/assets/map-base.svg"
              alt="Admin Map Canvas"
              className="max-w-none w-[1000px] sm:w-[1200px] md:w-[1400px] h-auto block select-none pointer-events-none drop-shadow-2xl"
              draggable={false}
            />

            {/* DYNAMIC CHECKPOINT PINS */}
            {checkpoints.map((cp) => {
              const posX = cp.posisi_x ?? 50;
              const posY = cp.posisi_y ?? 50;
              const isRestricted = cp.status_akses === 'dilarang';

              return (
                <div
                  key={cp.id}
                  onClick={(e) => handlePinClick(e, cp)}
                  className="absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 p-2 group transition-transform duration-150 hover:scale-125 active:scale-95"
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  title={`Klik untuk edit/hapus: ${cp.nama_id}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xl ${
                      isRestricted ? 'bg-red-600' : 'bg-blue-600'
                    }`}
                  >
                    <MapPin size={14} className="text-white" />
                  </div>

                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-md group-hover:scale-110 pointer-events-none">
                    {cp.nama_id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CRUD FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-white my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Building size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {modalMode === 'create' ? 'Tambah Checkpoint Baru' : 'Edit Checkpoint'}
                  </h2>
                  <p className="text-xs text-blue-400 font-mono font-semibold">
                    Koordinat Presisi: X: {cpForm.posisi_x}%, Y: {cpForm.posisi_y}%
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* SECTION 1: CHECKPOINT DATA */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Data Checkpoint
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Nama Gedung (ID)</label>
                    <input
                      type="text"
                      required
                      value={cpForm.nama_id}
                      onChange={(e) => setCpForm({ ...cpForm, nama_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Contoh: Gedung Techno 1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Nama Gedung (EN)</label>
                    <input
                      type="text"
                      required
                      value={cpForm.nama_en}
                      onChange={(e) => setCpForm({ ...cpForm, nama_en: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Example: Techno Building 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Pilih Zona</label>
                    <select
                      value={cpForm.zona_id}
                      onChange={(e) => setCpForm({ ...cpForm, zona_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.nama_id} ({z.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Jenis Titik</label>
                    <select
                      value={cpForm.jenis_titik}
                      onChange={(e) => setCpForm({ ...cpForm, jenis_titik: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="gerbang">Gerbang</option>
                      <option value="zona">Zona Utama</option>
                      <option value="akhir">Titik Akhir</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Status Akses</label>
                    <select
                      value={cpForm.status_akses}
                      onChange={(e) => setCpForm({ ...cpForm, status_akses: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="publik">Publik</option>
                      <option value="tur_saja">Tur Saja</option>
                      <option value="dilarang">Dilarang</option>
                    </select>
                  </div>
                </div>

                {/* Teaser Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Teaser / Petunjuk (ID)</label>
                    <input
                      type="text"
                      required
                      value={cpForm.teaser_id}
                      onChange={(e) => setCpForm({ ...cpForm, teaser_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Teaser / Petunjuk (EN)</label>
                    <input
                      type="text"
                      required
                      value={cpForm.teaser_en}
                      onChange={(e) => setCpForm({ ...cpForm, teaser_en: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Reveal Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Reveal / Konten Unlocked (ID)</label>
                    <textarea
                      required
                      rows={2}
                      value={cpForm.reveal_id}
                      onChange={(e) => setCpForm({ ...cpForm, reveal_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Reveal / Konten Unlocked (EN)</label>
                    <textarea
                      required
                      rows={2}
                      value={cpForm.reveal_en}
                      onChange={(e) => setCpForm({ ...cpForm, reveal_en: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-800" />

              {/* SECTION 2: LINKED KARTU DATA */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <CreditCard size={14} />
                  <span>Data Kartu Terkait</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Tipe Kartu</label>
                    <select
                      value={kartuForm.tipe}
                      onChange={(e) => setKartuForm({ ...kartuForm, tipe: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="skill">Skill</option>
                      <option value="riset">Riset</option>
                      <option value="pasar">Pasar</option>
                      <option value="bonus">Bonus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Tags (Pisahkan koma)</label>
                    <input
                      type="text"
                      value={kartuForm.tagsInput}
                      onChange={(e) => setKartuForm({ ...kartuForm, tagsInput: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Teknologi, AI, Robotik"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-800">
                {modalMode === 'edit' ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Trash2 size={16} />
                    <span>Hapus Pin</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pin'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

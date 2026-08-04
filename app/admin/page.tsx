'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Checkpoint, Kartu } from '../../lib/data';
import {
  LogOut,
  Save,
  CheckCircle2,
  Lock,
  Building,
  MapPin,
  Upload,
  Image as ImageIcon,
  Trash2,
  X,
  CreditCard,
  QrCode,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Checkpoints & Edit form state
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>('');
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  // Form fields state - Checkpoint
  const [formData, setFormData] = useState<{
    nama_id: string;
    nama_en: string;
    kode_qr: string;
    teaser_id: string;
    teaser_en: string;
    reveal_id: string;
    reveal_en: string;
    status_akses: string;
  }>({
    nama_id: '',
    nama_en: '',
    kode_qr: '',
    teaser_id: '',
    teaser_en: '',
    reveal_id: '',
    reveal_en: '',
    status_akses: 'publik',
  });

  // Form fields state - Kartu & Icon Upload
  const [kartuData, setKartuData] = useState<{
    id: string;
    tipe: string;
    tagsInput: string;
    ikon_url: string | null;
  }>({
    id: '',
    tipe: 'skill',
    tagsInput: '',
    ikon_url: null,
  });

  const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Session check on mount & auth listener
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

  // 2. Fetch checkpoints when logged in
  useEffect(() => {
    if (session) {
      loadCheckpoints();
    }
  }, [session]);

  const loadCheckpoints = async () => {
    setIsLoadingCheckpoints(true);
    try {
      const { data, error } = await supabase
        .from('checkpoint')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error fetching checkpoints:', error);
      } else if (data && data.length > 0) {
        setCheckpoints(data);
        if (!selectedCheckpointId) {
          selectCheckpoint(data[0]);
        } else {
          const current = data.find((c) => c.id === selectedCheckpointId);
          if (current) selectCheckpoint(current);
        }
      }
    } catch (err) {
      console.error('Failed to load checkpoints', err);
    } finally {
      setIsLoadingCheckpoints(false);
    }
  };

  const selectCheckpoint = async (cp: Checkpoint) => {
    setSelectedCheckpointId(cp.id);
    setFormData({
      nama_id: cp.nama_id || '',
      nama_en: cp.nama_en || '',
      kode_qr: cp.kode_qr || '',
      teaser_id: cp.teaser_id || '',
      teaser_en: cp.teaser_en || '',
      reveal_id: cp.reveal_id || '',
      reveal_en: cp.reveal_en || '',
      status_akses: cp.status_akses || 'publik',
    });

    setSelectedIconFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Fetch linked kartu
    try {
      const { data: kData } = await supabase
        .from('kartu')
        .select('*')
        .eq('checkpoint_id', cp.id)
        .single();

      if (kData) {
        setKartuData({
          id: kData.id,
          tipe: kData.tipe || 'skill',
          tagsInput: Array.isArray(kData.tags) ? kData.tags.join(', ') : '',
          ikon_url: kData.ikon_url || null,
        });
      } else {
        setKartuData({
          id: `kartu_${Date.now()}`,
          tipe: 'skill',
          tagsInput: '',
          ikon_url: null,
        });
      }
    } catch (err) {
      setKartuData({
        id: `kartu_${Date.now()}`,
        tipe: 'skill',
        tagsInput: '',
        ikon_url: null,
      });
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cpId = e.target.value;
    const found = checkpoints.find((c) => c.id === cpId);
    if (found) {
      selectCheckpoint(found);
    }
  };

  // 3. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoginError('Email atau password salah');
      }
    } catch (err) {
      setLoginError('Email atau password salah');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEmail('');
    setPassword('');
    setLoginError(null);
  };

  // Copy QR Code to clipboard
  const handleCopyQr = () => {
    if (!formData.kode_qr) return;
    navigator.clipboard.writeText(formData.kode_qr);
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2000);
  };

  // Delete/Remove Icon action
  const handleRemoveIcon = () => {
    setSelectedIconFile(null);
    setKartuData((prev) => ({ ...prev, ikon_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 5. Handle Save Checkpoint & Kartu with Storage Upload
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckpointId) return;

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      alert('Session admin tidak ditemukan — silakan login ulang');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Storage Upload for Kartu Icon (if new file selected)
      let finalIkonUrl = kartuData.ikon_url;

      if (selectedIconFile) {
        try {
          const fileExt = selectedIconFile.name.split('.').pop() || 'png';
          const fileName = `icon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { data: { session: debugSession } } = await supabase.auth.getSession();
          console.log('SESSION SAAT UPLOAD ICON:', debugSession);

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('kartu_icons')
            .upload(filePath, selectedIconFile, { upsert: true });

          if (uploadErr) {
            console.warn('Storage upload error:', uploadErr.message);
            alert(`Peringatan Upload Storage: ${uploadErr.message}`);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('kartu_icons')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              finalIkonUrl = publicUrlData.publicUrl;
            }
          }
        } catch (err: any) {
          console.warn('File upload exception:', err);
        }
      }

      // 2. Update Checkpoint Table (including kode_qr)
      const updatedFields = {
        nama_id: formData.nama_id,
        nama_en: formData.nama_en,
        kode_qr: formData.kode_qr,
        teaser_id: formData.teaser_id,
        teaser_en: formData.teaser_en,
        reveal_id: formData.reveal_id,
        reveal_en: formData.reveal_en,
        status_akses: formData.status_akses,
      };

      const { data: cpResult, error: cpError } = await supabase
        .from('checkpoint')
        .update(updatedFields)
        .eq('id', selectedCheckpointId)
        .select();

      if (cpError) {
        alert('Gagal simpan checkpoint: ' + cpError.message);
        return;
      }

      // 3. Upsert Kartu Table with ikon_url
      const tagsArray = kartuData.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error: kartuError } = await supabase.from('kartu').upsert([
        {
          id: kartuData.id || `kartu_${Date.now()}`,
          checkpoint_id: selectedCheckpointId,
          tipe: kartuData.tipe,
          tags: tagsArray,
          ikon_url: finalIkonUrl,
        },
      ]);

      if (kartuError) {
        console.warn('Peringatan update kartu:', kartuError.message);
      }

      setSelectedIconFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);

      loadCheckpoints();
    } catch (err: any) {
      alert('Gagal simpan: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  // LOGIN FORM
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-400 mb-1 border border-blue-500/20">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Solo Technopark</h1>
            <p className="text-xs text-slate-400">Masuk untuk mengelola konten checkpoint & kode QR</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium animate-in fade-in duration-200">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@solotechnopark.id"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Masuk Admin'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN ADMIN FORM PAGE
  return (
    <div className="min-h-screen overflow-y-auto bg-slate-950 text-slate-100 font-sans">
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-3 fade-in duration-200">
          <CheckCircle2 size={18} />
          <span>Tersimpan ke Supabase</span>
        </div>
      )}

      {/* Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Building size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">Kelola Konten & Kode QR Checkpoint</h1>
            <p className="text-xs text-slate-400">{session.user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/map"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <MapPin size={15} />
            <span>Editor Peta Visual</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl text-xs font-semibold text-slate-300 transition-all"
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-6 pb-20">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Dropdown Checkpoint dengan Tampilan Kode QR Langsung */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pilih Gedung / Checkpoint ({checkpoints.length} Tersedia)
            </label>
            {isLoadingCheckpoints ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 animate-pulse">
                Memuat daftar checkpoint...
              </div>
            ) : (
              <select
                value={selectedCheckpointId}
                onChange={handleSelectChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {checkpoints.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.nama_id} — [QR: {cp.kode_qr || 'Belum Ada'}]
                  </option>
                ))}
              </select>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* Form Edit Konten & Kode QR */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* SECTION 1: KONTEN CHECKPOINT */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Building size={16} />
                <span>1. Detail Konten Gedung & Kode QR Scanner</span>
              </h2>

              {/* Nama Gedung */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Gedung (ID) — <span className="text-slate-400">nama_id</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_id}
                    onChange={(e) => setFormData({ ...formData, nama_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Gedung (EN) — <span className="text-slate-400">nama_en</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_en}
                    onChange={(e) => setFormData({ ...formData, nama_en: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* KODE QR TEXTFIELD PROMINENT CARD */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <QrCode size={16} />
                    <span>Kode QR Scanner Gedung (Tabel Checkpoint: `kode_qr`)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyQr}
                      className="text-[11px] px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 font-bold transition-all flex items-center gap-1"
                    >
                      {copiedQr ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedQr ? 'Tersalin' : 'Salin Kode'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, kode_qr: `STP-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}` })}
                      className="text-[11px] px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg font-bold transition-all"
                    >
                      + Generate QR Baru
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.kode_qr}
                    onChange={(e) => setFormData({ ...formData, kode_qr: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 tracking-wide"
                    placeholder="Masukkan string kode QR fisik (Contoh: STP-QR-A12B3)"
                  />
                  <QrCode size={18} className="absolute right-3.5 top-3.5 text-amber-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Value ini harus sama persis dengan string teks yang di-encode pada Stiker/QR Code fisik gedung ini.
                </p>
              </div>

              {/* Teaser */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teaser (ID) — <span className="text-slate-400">teaser_id</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.teaser_id}
                    onChange={(e) => setFormData({ ...formData, teaser_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teaser (EN) — <span className="text-slate-400">teaser_en</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.teaser_en}
                    onChange={(e) => setFormData({ ...formData, teaser_en: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Reveal (Textarea) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reveal (ID) — <span className="text-slate-400">reveal_id</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reveal_id}
                  onChange={(e) => setFormData({ ...formData, reveal_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reveal (EN) — <span className="text-slate-400">reveal_en</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reveal_en}
                  onChange={(e) => setFormData({ ...formData, reveal_en: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Akses */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status Akses
                </label>
                <div className="flex flex-wrap gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-200">
                    <input
                      type="radio"
                      name="status_akses"
                      value="publik"
                      checked={formData.status_akses === 'publik'}
                      onChange={(e) => setFormData({ ...formData, status_akses: e.target.value })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <span>Publik</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-200">
                    <input
                      type="radio"
                      name="status_akses"
                      value="tur_saja"
                      checked={formData.status_akses === 'tur_saja'}
                      onChange={(e) => setFormData({ ...formData, status_akses: e.target.value })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <span>Tur Saja</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-200">
                    <input
                      type="radio"
                      name="status_akses"
                      value="dilarang"
                      checked={formData.status_akses === 'dilarang'}
                      onChange={(e) => setFormData({ ...formData, status_akses: e.target.value })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <span>Dilarang</span>
                  </label>
                </div>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* SECTION 2: KARTU & SUPABASE STORAGE ICON UPLOAD */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CreditCard size={15} />
                <span>2. Kelola Data & Ikon Kartu (PNG / SVG / JPEG)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipe Kartu — <span className="text-slate-400">tipe</span>
                  </label>
                  <select
                    value={kartuData.tipe}
                    onChange={(e) => setKartuData({ ...kartuData, tipe: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="skill">Skill</option>
                    <option value="riset">Riset</option>
                    <option value="pasar">Pasar</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tags (Pisahkan koma) — <span className="text-slate-400">tags</span>
                  </label>
                  <input
                    type="text"
                    value={kartuData.tagsInput}
                    onChange={(e) => setKartuData({ ...kartuData, tagsInput: e.target.value })}
                    placeholder="Teknologi, AI, Robotik"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Upload & Preview File Ikon Kartu */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Upload size={15} className="text-blue-400" />
                  <span>Upload / Replace Ikon Kartu (Supabase Storage: kartu_icons)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/svg+xml, image/jpeg"
                  onChange={(e) => setSelectedIconFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />

                {/* THUMBNAIL & REMOVE ICON ACTION */}
                {(selectedIconFile || kartuData.ikon_url) && (
                  <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {selectedIconFile ? (
                        <img
                          src={URL.createObjectURL(selectedIconFile)}
                          alt="Icon Preview"
                          className="w-10 h-10 object-contain rounded-lg bg-slate-950 p-1 border border-slate-700"
                        />
                      ) : kartuData.ikon_url ? (
                        <img
                          src={kartuData.ikon_url}
                          alt="Existing Icon"
                          className="w-10 h-10 object-contain rounded-lg bg-slate-950 p-1 border border-slate-700"
                        />
                      ) : (
                        <ImageIcon size={24} className="text-slate-500" />
                      )}

                      <div className="truncate text-xs">
                        <p className="font-semibold text-white truncate">
                          {selectedIconFile ? selectedIconFile.name : 'Ikon Terpasang di Database'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {selectedIconFile
                            ? `${(selectedIconFile.size / 1024).toFixed(1)} KB`
                            : kartuData.ikon_url}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                      title="Hapus / Lepaskan Ikon"
                    >
                      <Trash2 size={14} />
                      <span>Hapus Ikon</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Simpan */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} />
                  <span>Simpan Perubahan Konten & Kode QR</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

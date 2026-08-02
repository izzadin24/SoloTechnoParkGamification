'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Checkpoint } from '../../lib/data';
import { LogOut, Save, CheckCircle2, Lock, Building } from 'lucide-react';

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

  // Form fields state
  const [formData, setFormData] = useState<{
    nama_id: string;
    nama_en: string;
    teaser_id: string;
    teaser_en: string;
    reveal_id: string;
    reveal_en: string;
    status_akses: string;
  }>({
    nama_id: '',
    nama_en: '',
    teaser_id: '',
    teaser_en: '',
    reveal_id: '',
    reveal_en: '',
    status_akses: 'publik',
  });

  // 1. Session check on mount & auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const selectCheckpoint = (cp: Checkpoint) => {
    setSelectedCheckpointId(cp.id);
    setFormData({
      nama_id: cp.nama_id || '',
      nama_en: cp.nama_en || '',
      teaser_id: cp.teaser_id || '',
      teaser_en: cp.teaser_en || '',
      reveal_id: cp.reveal_id || '',
      reveal_en: cp.reveal_en || '',
      status_akses: cp.status_akses || 'publik',
    });
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

  // 5. Handle Save Checkpoint
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckpointId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('checkpoint')
        .update({
          nama_id: formData.nama_id,
          nama_en: formData.nama_en,
          teaser_id: formData.teaser_id,
          teaser_en: formData.teaser_en,
          reveal_id: formData.reveal_id,
          reveal_en: formData.reveal_en,
          status_akses: formData.status_akses,
        })
        .eq('id', selectedCheckpointId);

      if (error) {
        alert('Gagal menyimpan: ' + error.message);
      } else {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);

        loadCheckpoints();
      }
    } catch (err) {
      alert('Gagal menyimpan data');
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

  // ==========================================
  // LOGIN FORM (Session Kosong)
  // ==========================================
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-400 mb-1 border border-blue-500/20">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Solo Technopark</h1>
            <p className="text-xs text-slate-400">Masuk untuk mengelola konten checkpoint</p>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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

  // ==========================================
  // EDIT CHECKPOINT FORM (Session Ada)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Toast Notification (Tersimpan - 2 detik) */}
      {saveSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-3 fade-in duration-200">
          <CheckCircle2 size={18} />
          <span>Tersimpan</span>
        </div>
      )}

      {/* Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Building size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">Kelola Konten Checkpoint</h1>
            <p className="text-xs text-slate-400">{session.user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl text-xs font-semibold text-slate-300 transition-all"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-6 pb-20">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          
          {/* Dropdown Checkpoint */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pilih Checkpoint ({checkpoints.length} Tersedia)
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
                    {cp.nama_id} ({cp.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* Form Edit Konten */}
          <form onSubmit={handleSave} className="space-y-5">
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

            {/* Status Akses (3 Radio Buttons: publik / tur_saja / dilarang) */}
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
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

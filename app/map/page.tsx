'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Checkpoint, Zona } from '../../lib/data';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ScanLine,
  Lock,
  Building,
  X,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  MapPin,
  Compass
} from 'lucide-react';

export default function VisitorMapPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [zones, setZones] = useState<Zona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [lang, setLang] = useState<'id' | 'en'>('id');

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch dynamic data from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: cpData }, { data: zData }] = await Promise.all([
        supabase.from('checkpoint').select('*'),
        supabase.from('zona').select('*').order('urutan', { ascending: true })
      ]);

      if (cpData) setCheckpoints(cpData);
      if (zData) setZones(zData);
    } catch (err) {
      console.error('Error fetching map data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Zoom Controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.8));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse pan event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only main click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.15 : -0.15;
    setScale((prev) => Math.min(Math.max(prev + zoomFactor, 0.8), 4));
  };

  // Touch pan & pinch-zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...pan };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
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
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy,
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (currentDist - touchDistanceRef.current) * 0.005;
      setScale((prev) => Math.min(Math.max(prev + delta, 0.8), 4));
      touchDistanceRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  // Helper to resolve zone colors
  const getZoneTheme = (zonaId: string) => {
    const zone = zones.find((z) => z.id === zonaId);
    if (!zone) return { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-400' };
    const color = zone.warna_tema?.toLowerCase() || '';
    if (color.includes('emerald') || color.includes('green'))
      return { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-400' };
    if (color.includes('amber') || color.includes('yellow') || color.includes('orange'))
      return { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-400' };
    if (color.includes('purple') || color.includes('violet'))
      return { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-400' };
    if (color.includes('rose') || color.includes('red'))
      return { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-400' };
    return { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-400' };
  };

  const getZoneName = (zonaId: string) => {
    const zone = zones.find((z) => z.id === zonaId);
    if (!zone) return 'Zona Solo Technopark';
    return lang === 'id' ? zone.nama_id : zone.nama_en;
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none font-sans text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass size={16} className="text-blue-400" />
              <span>Peta Interaktif Solo Technopark</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {checkpoints.length} Checkpoint Terdeteksi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-blue-400 border border-slate-700 transition-all uppercase"
          >
            {lang}
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Floating Zoom & Control Toolbar */}
      <div className="absolute right-4 top-20 z-30 flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
        <button
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <hr className="border-slate-800 my-0.5" />
        <button
          onClick={handleResetZoom}
          className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
          title="Reset Display"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Interactive Map Canvas Container */}
      <div
        ref={containerRef}
        className={`flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
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
        {/* Map Wrapper with GPU hardware acceleration transform */}
        <div
          className="relative inline-block transition-transform ease-out duration-75 origin-center"
          style={{
            willChange: 'transform',
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
        >
          {/* Static SVG Map Background */}
          <img
            src="/assets/map-base.svg"
            alt="Solo Techno Park Map Base"
            className="max-w-none w-[1000px] sm:w-[1200px] md:w-[1400px] h-auto block select-none pointer-events-none drop-shadow-2xl"
            draggable={false}
          />

          {/* DYNAMIC CHECKPOINT PINS OVERLAY */}
          {checkpoints.map((cp) => {
            const posX = cp.posisi_x ?? 50;
            const posY = cp.posisi_y ?? 50;
            const isRestricted = cp.status_akses === 'dilarang';
            const theme = getZoneTheme(cp.zona_id);
            const isSelected = selectedCheckpoint?.id === cp.id;
            const pinLabel = lang === 'id' ? cp.nama_id : cp.nama_en;

            return (
              <div
                key={cp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCheckpoint(cp);
                }}
                className={`absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                }`}
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                }}
                title={pinLabel}
              >
                {/* Pin Pulse Glow Effect */}
                <div
                  className={`absolute -inset-1.5 rounded-full ${theme.bg} opacity-40 blur-sm animate-pulse`}
                />

                {/* Main Pin Element */}
                <div
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 border-white shadow-xl ${
                    isRestricted ? 'bg-slate-800 border-red-500' : theme.bg
                  }`}
                >
                  {isRestricted ? (
                    <Lock size={14} className="text-red-400" />
                  ) : (
                    <MapPin size={16} className="text-white fill-white/30" />
                  )}
                </div>

                {/* Floating Pin Label */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-md shadow-md text-[10px] font-bold text-white whitespace-nowrap pointer-events-none">
                  {pinLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CARD HINT BOTTOM-SHEET MODAL */}
      {selectedCheckpoint && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 flex justify-center pointer-events-auto">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedCheckpoint(null)}
          />

          {/* Bottom-Sheet Card */}
          <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 text-white space-y-4 animate-in slide-in-from-bottom duration-300 backdrop-blur-md">
            {/* Close Button */}
            <button
              onClick={() => setSelectedCheckpoint(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50"
            >
              <X size={16} />
            </button>

            {/* Header / Zone Tag */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {getZoneName(selectedCheckpoint.zona_id)}
                </span>

                {selectedCheckpoint.status_akses === 'dilarang' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <Lock size={10} /> Dilarang
                  </span>
                ) : selectedCheckpoint.status_akses === 'tur_saja' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Tur Saja
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Publik
                  </span>
                )}
              </div>

              <h2 className="text-xl font-black text-white flex items-center gap-2 pt-1">
                <Building size={20} className="text-blue-400 shrink-0" />
                <span>
                  {lang === 'id'
                    ? selectedCheckpoint.nama_id
                    : selectedCheckpoint.nama_en}
                </span>
              </h2>
            </div>

            {/* Card Hint Teaser */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Sparkles size={14} className="text-amber-400" />
                <span>Petunjuk Kartu (Teaser)</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                &ldquo;
                {lang === 'id'
                  ? selectedCheckpoint.teaser_id
                  : selectedCheckpoint.teaser_en}
                &rdquo;
              </p>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2">
              <Link
                href={`/?view=scanner&checkpointId=${selectedCheckpoint.id}`}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all"
              >
                <ScanLine size={18} />
                <span>Scan QR untuk Unlock Full Reveal</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

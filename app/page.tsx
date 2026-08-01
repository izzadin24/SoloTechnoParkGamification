'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GameData, fetchGameData } from '../lib/data';
import { supabase } from '../lib/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Map, ScanLine, LayoutGrid, Hammer, X, Check, ArrowRight, Lock, Star, Plus, Minus, RotateCcw } from 'lucide-react';

import snapshotData from '../data/snapshot.json';
import mapImage from '../imageclip_opt.webp';
import pageBackground from '../gedung-solo-technopark_169.jpeg';

type ViewState = 'landing' | 'map' | 'scanner' | 'teaser' | 'reveal' | 'inventory' | 'blueprint';
type Lang = 'id' | 'en';

interface PlayerProgress {
  ideaId: string | null;
  scannedCheckpoints: string[];
  collectedCards: string[];
}

interface StatQueueItem {
  checkpoint_id: string;
  terakhir_update: string;
}

export default function GameApp() {
  const [view, setView] = useState<ViewState>('landing');
  const [lang, setLang] = useState<Lang>('id');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>({
    ideaId: null,
    scannedCheckpoints: [],
    collectedCards: []
  });
  const [currentScan, setCurrentScan] = useState<{ checkpointId: string; cardId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [statQueue, setStatQueue] = useState<StatQueueItem[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      const savedProgress = localStorage.getItem('stp_progress');
      if (savedProgress) setProgress(JSON.parse(savedProgress));

      const savedQueue = localStorage.getItem('stp_statqueue');
      if (savedQueue) setStatQueue(JSON.parse(savedQueue));

      const savedData = localStorage.getItem('stp_gamedata');
      if (savedData) {
        setGameData(JSON.parse(savedData));
      } else {
        setGameData(snapshotData as GameData);
      }

      try {
        const data = await fetchGameData();
        if (data && data.zones.length > 0) {
          setGameData(data);
          localStorage.setItem('stp_gamedata', JSON.stringify(data));
        }
      } catch (e) {
        console.warn('Background sync failed', e);
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    localStorage.setItem('stp_progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('stp_statqueue', JSON.stringify(statQueue));
    processStatQueue();
  }, [statQueue]);

  useEffect(() => {
    const handleOnline = () => processStatQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [statQueue]);

  const processStatQueue = async () => {
    if (navigator.onLine && statQueue.length > 0) {
      try {
        await supabase.from('statistik').insert(statQueue);
        setStatQueue([]);
      } catch (e) {
        console.error('Failed to send stats', e);
      }
    }
  };

  const handleStart = (ideaId: string) => {
    setProgress(prev => ({ ...prev, ideaId }));
    setView('map');
  };

  const handleScanSuccess = (decodedText: string) => {
    if (!gameData) return;
    
    const checkpoint = gameData.checkpoints.find(c => c.kode_qr === decodedText);
    if (!checkpoint) {
      alert(lang === 'id' ? 'QR tidak valid' : 'Invalid QR');
      return;
    }

    if (progress.scannedCheckpoints.includes(checkpoint.id)) {
      alert(lang === 'id' ? 'Checkpoint ini sudah diselesaikan' : 'Checkpoint already completed');
      setView('map');
      return;
    }

    const card = gameData.cards.find(c => c.checkpoint_id === checkpoint.id);
    if (!card) {
      alert(lang === 'id' ? 'Kartu tidak ditemukan untuk checkpoint ini' : 'Card not found for this checkpoint');
      setView('map');
      return;
    }

    setCurrentScan({ checkpointId: checkpoint.id, cardId: card.id });
    
    setStatQueue(prev => [...prev, { checkpoint_id: checkpoint.id, terakhir_update: new Date().toISOString() }]);
    
    setView('teaser');
  };

  const claimCard = () => {
    if (!currentScan) return;
    setProgress(prev => ({
      ...prev,
      scannedCheckpoints: [...prev.scannedCheckpoints, currentScan.checkpointId],
      collectedCards: [...prev.collectedCards, currentScan.cardId]
    }));
    setView('reveal');
  };

  const t = (idText: string, enText: string) => lang === 'id' ? idText : enText;

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 font-sans"
      style={{
        backgroundImage: `url(${pageBackground.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="min-h-screen w-full bg-slate-950/55 backdrop-blur-[2px]">
        {view !== 'landing' && (
          <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
            <div className="font-bold text-lg text-slate-800">
              Jelajah STP
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('map')} className={`p-2 rounded-lg ${view === 'map' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Map size={20} />
              </button>
              <button onClick={() => setView('scanner')} className={`p-2 rounded-lg ${view === 'scanner' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                <ScanLine size={20} />
              </button>
              <button onClick={() => setView('inventory')} className={`p-2 rounded-lg ${view === 'inventory' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                <LayoutGrid size={20} />
              </button>
              <button onClick={() => setView('blueprint')} className={`p-2 rounded-lg ${view === 'blueprint' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Hammer size={20} />
              </button>
            </div>
          </header>
        )}

        <main className="max-w-md mx-auto p-4 pb-24">
          {view === 'landing' && (
            <LandingView 
              lang={lang} 
              setLang={setLang} 
              gameData={gameData}
              isLoading={isLoading}
              error={error}
              onStart={handleStart}
              t={t}
            />
          )}
          
          {view === 'map' && gameData && (
            <MapView 
              gameData={gameData} 
              progress={progress} 
              onScan={() => setView('scanner')} 
              onScanManual={handleScanSuccess}
              t={t} 
              lang={lang}
            />
          )}
          
          {view === 'scanner' && (
            <ScannerView 
              onSuccess={handleScanSuccess} 
              onCancel={() => setView('map')} 
              t={t}
              lang={lang}
            />
          )}

          {view === 'teaser' && currentScan && gameData && (
            <TeaserView 
              card={gameData.cards.find(c => c.id === currentScan.cardId)!} 
              onContinue={claimCard} 
              t={t}
              lang={lang}
            />
          )}

          {view === 'reveal' && currentScan && gameData && (
            <RevealView 
              card={gameData.cards.find(c => c.id === currentScan.cardId)!} 
              checkpoint={gameData.checkpoints.find(c => c.id === currentScan.checkpointId)!}
              onClose={() => {
                setCurrentScan(null);
                setView('inventory');
              }} 
              t={t}
              lang={lang}
            />
          )}

          {view === 'inventory' && gameData && (
            <InventoryView 
              gameData={gameData} 
              progress={progress} 
              t={t}
              lang={lang}
            />
          )}

          {view === 'blueprint' && gameData && progress.ideaId && (
            <BlueprintView 
              gameData={gameData} 
              progress={progress} 
              onBackToMap={() => setView('map')}
              t={t}
              lang={lang}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTS
// ==========================================

function LandingView({ lang, setLang, gameData, isLoading, error, onStart, t }: any) {
  const ideas = gameData?.ideas || [];
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);

  useEffect(() => {
    if (ideas.length > 0 && !selectedIdea) {
      setSelectedIdea(ideas[0].id);
    }
  }, [ideas, selectedIdea]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
      <div className="rounded-2xl border border-white/30 bg-white/15 px-6 py-5 shadow-xl backdrop-blur-md">
        <h1 className="text-3xl font-black text-white mb-2">Jelajah Solo Technopark</h1>
        <p className="text-slate-100">{t('Mulai petualangan inovasimu', 'Start your innovation journey')}</p>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-full w-full max-w-[200px]">
        <button 
          onClick={() => setLang('id')} 
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${lang === 'id' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
        >
          ID
        </button>
        <button 
          onClick={() => setLang('en')} 
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${lang === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
        >
          EN
        </button>
      </div>

      <div className="w-full rounded-2xl border border-white/30 bg-slate-950/35 p-4 text-left shadow-xl backdrop-blur-xl">
        <h2 className="font-bold text-lg mb-3 text-white">{t('Pilih Ide Produkmu:', 'Choose Your Product Idea:')}</h2>
        {isLoading ? (
          <div className="p-4 rounded-xl border border-white/20 bg-white/80 text-center text-slate-600 animate-pulse">
            {t('Memuat data dari Supabase...', 'Loading data from Supabase...')}
          </div>
        ) : ideas.length > 0 ? (
          <div className="grid gap-3">
            {ideas.map((idea: any) => (
              <div 
                key={idea.id} 
                onClick={() => setSelectedIdea(idea.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedIdea === idea.id ? 'border-blue-400 bg-blue-600/90 text-white shadow-md' : 'border-white/20 bg-white/85 text-slate-800'}`}
              >
                <h3 className="font-bold">{lang === 'id' ? idea.nama_id : idea.nama_en}</h3>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-red-200/70 bg-red-50/90 text-red-700 text-sm">
            {error || t('Gagal memuat data ide, cek koneksi Supabase', 'Failed to load ideas data, check Supabase connection')}
          </div>
        )}
      </div>

      {error && ideas.length > 0 && (
        <div className="p-3 bg-red-100/90 text-red-700 rounded-lg text-sm w-full">
          {error}
        </div>
      )}

      <button 
        onClick={() => selectedIdea && onStart(selectedIdea)}
        disabled={isLoading || !selectedIdea}
        className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
      >
        {isLoading ? t('Memuat Data...', 'Loading Data...') : t('Mulai Bermain', 'Start Playing')}
      </button>
    </div>
  );
}

function MapView({ gameData, progress, onScan, onScanManual, t, lang }: any) {
  const [manualCode, setManualCode] = useState('');
  const [zoomDisplay, setZoomDisplay] = useState(100);
  
  // Direct refs for 60FPS GPU hardware acceleration without React re-render overhead
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const touchStateRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContentRef = useRef<HTMLDivElement>(null);

  // DOKUMEN WARNA BERDASARKAN ZONA_ID
  const getZoneColor = (zonaId: string) => {
    switch (zonaId) {
      case 'zona-1':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-200',
          dot: 'bg-amber-200',
        };
      case 'zona-2':
        return {
          bg: 'bg-blue-700',
          border: 'border-blue-300',
          dot: 'bg-blue-200',
        };
      case 'zona-3':
        return {
          bg: 'bg-rose-500',
          border: 'border-rose-200',
          dot: 'bg-rose-200',
        };
      case 'zona-4':
        return {
          bg: 'bg-purple-500',
          border: 'border-purple-200',
          dot: 'bg-purple-200',
        };
      default:
        return {
          bg: 'bg-sky-500',
          border: 'border-sky-200',
          dot: 'bg-sky-200',
        };
    }
  };

  const clampScale = (val: number) => Math.min(3, Math.max(0.5, val));

  // Fast GPU hardware layer transform update via requestAnimationFrame
  const applyTransform = () => {
    if (mapContentRef.current) {
      mapContentRef.current.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${scaleRef.current})`;
    }
  };

  const scheduleUpdate = () => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        applyTransform();
        setZoomDisplay(Math.round(scaleRef.current * 100));
        rafIdRef.current = null;
      });
    }
  };

  const handleZoomIn = () => {
    scaleRef.current = clampScale(scaleRef.current + 0.25);
    scheduleUpdate();
  };

  const handleZoomOut = () => {
    scaleRef.current = clampScale(scaleRef.current - 0.25);
    scheduleUpdate();
  };

  const handleResetZoom = () => {
    scaleRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    scheduleUpdate();
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.1 : 0.1;
    scaleRef.current = clampScale(scaleRef.current + direction);
    scheduleUpdate();
  };

  // Mouse Pointer Dragging (Desktop)
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    event.preventDefault();
    isDraggingRef.current = true;
    pointerStartRef.current = { x: event.clientX - panRef.current.x, y: event.clientY - panRef.current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || !isDraggingRef.current) return;
    event.preventDefault();
    panRef.current = {
      x: event.clientX - pointerStartRef.current.x,
      y: event.clientY - pointerStartRef.current.y,
    };
    scheduleUpdate();
  };

  const stopPointerDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    isDraggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // Touch Handlers for Android Mobile Devices (1-finger pan, 2-finger pinch & pan)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStateRef.current = {
        x: e.touches[0].clientX - panRef.current.x,
        y: e.touches[0].clientY - panRef.current.y,
        dist: 0,
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      touchStateRef.current = {
        x: midX - panRef.current.x,
        y: midY - panRef.current.y,
        dist,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStateRef.current) return;

    if (e.touches.length === 1) {
      panRef.current = {
        x: e.touches[0].clientX - touchStateRef.current.x,
        y: e.touches[0].clientY - touchStateRef.current.y,
      };
      scheduleUpdate();
    } else if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();

      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      if (touchStateRef.current.dist > 0) {
        const ratio = dist / touchStateRef.current.dist;
        scaleRef.current = clampScale(scaleRef.current * ratio);
      }

      panRef.current = {
        x: midX - touchStateRef.current.x,
        y: midY - touchStateRef.current.y,
      };
      touchStateRef.current.dist = dist;
      scheduleUpdate();
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-xl">{t('Peta Kawasan', 'Area Map')}</h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
            {t('Gunakan 2 jari untuk zoom/geser', 'Use 2 fingers to zoom/pan')}
          </span>
        </div>

        {/* Viewport Peta Center */}
        <div 
          ref={containerRef}
          className="relative w-full h-[65vh] rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 touch-none select-none flex items-center justify-center p-4"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPointerDragging}
          onPointerLeave={stopPointerDragging}
          onPointerCancel={stopPointerDragging}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onContextMenu={(event) => event.preventDefault()}
        >
          {/* Pembungkus Zoom GPU Accelerated Layer */}
          <div
            ref={mapContentRef}
            className="transition-transform duration-75 ease-out origin-center flex items-center justify-center min-w-full min-h-full"
            style={{ 
              willChange: 'transform',
              transform: `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${scaleRef.current})`,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div className="relative inline-block w-fit h-fit">
              <img
                src={mapImage.src}
                alt={t('Peta kawasan', 'Area map')}
                className="max-w-full max-h-[60vh] object-contain cursor-grab pointer-events-none block rounded-lg"
                draggable={false}
                style={{ imageRendering: 'auto' }}
              />

              {/* RENDER PIN CHECKPOINT DENGAN WARNA DINAMIS */}
              {gameData?.checkpoints?.map((cp: any) => {
                const isScanned = progress.scannedCheckpoints.includes(cp.id);
                const posX = cp.posisi_x ?? 50;
                const posY = cp.posisi_y ?? 50;
                
                const zoneColor = getZoneColor(cp.zona_id);

                return (
                  <div
                    key={cp.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform hover:scale-125 active:scale-110"
                    style={{ left: `${posX}%`, top: `${posY}%` }}
                    title={lang === 'id' ? cp.nama_id : cp.nama_en}
                  >
                    {isScanned ? (
                      <div className="w-7 h-7 bg-emerald-500 border-2 border-white text-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className={`w-6 h-6 ${zoneColor.bg} border-2 border-white rounded-full shadow-md flex items-center justify-center`}>
                        <div className={`w-2 h-2 ${zoneColor.dot} rounded-full`}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Mobile/Touch Controls (Zoom In, Zoom Out, Reset) */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 shadow-lg text-slate-700">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-lg transition-all"
              title={t('Perbesar', 'Zoom In')}
            >
              <Plus size={18} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-lg transition-all"
              title={t('Perkecil', 'Zoom Out')}
            >
              <Minus size={18} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-lg transition-all"
              title={t('Reset Zoom', 'Reset Zoom')}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Zoom Level Badge */}
          <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 text-[11px] font-bold text-slate-800 shadow-md">
            {zoomDisplay}%
          </div>
        </div>

        {/* LEGENDA WARNA ZONA */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm"></span>
            <span>{t('Zona 1', 'Zone 1')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-700 inline-block shadow-sm"></span>
            <span>{t('Zona 2', 'Zone 2')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm"></span>
            <span>{t('Zona 3', 'Zone 3')}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onScan}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
      >
        <ScanLine size={24} />
        {t('Scan QR Checkpoint', 'Scan Checkpoint QR')}
      </button>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-sm font-semibold mb-2">{t('Kamera bermasalah?', 'Camera issue?')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('Masukkan ID manual', 'Enter manual ID')}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              if (manualCode) onScanManual(manualCode);
              setManualCode('');
            }}
            className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300"
          >
            {t('Kirim', 'Submit')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScannerView({ onSuccess, onCancel, t, lang }: any) {
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    setTimeout(() => {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );
      
      scanner.render(
        (text) => {
          if (scanner) {
            scanner.clear();
          }
          onSuccess(text);
        },
        (error) => {
          // quiet fail
        }
      );
    }, 100);

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [onSuccess]);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 relative">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm text-slate-600 hover:text-slate-900"
        >
          <X size={24} />
        </button>
        
        <div className="p-4 bg-slate-900 text-white text-center">
          <h2 className="font-bold">{t('Arahkan kamera ke QR', 'Point camera at QR')}</h2>
        </div>
        
        <div id="qr-reader" className="w-full"></div>
      </div>
    </div>
  );
}

function TeaserView({ card, onContinue, t, lang }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-white/30 bg-white/15 px-6 py-5 shadow-xl backdrop-blur-md">
        <h2 className="text-2xl font-black text-white">{t('Data Ditemukan!', 'Data Found!')}</h2>
        <p className="text-slate-100 mt-1">{t('Mengekstrak informasi...', 'Extracting information...')}</p>
      </div>

      <div className="w-48 h-64 bg-slate-200 rounded-xl border-4 border-dashed border-slate-300 flex items-center justify-center shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-300/50 to-transparent"></div>
        <span className="text-slate-400 font-bold text-4xl">?</span>
      </div>

      <button 
        onClick={onContinue}
        className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
      >
        {t('Buka Kartu', 'Reveal Card')}
      </button>
    </div>
  );
}

function RevealView({ card, checkpoint, onClose, t, lang }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 animate-in zoom-in-90 duration-500">
      <div className="w-full text-center rounded-2xl border border-white/30 bg-white/15 px-6 py-5 shadow-xl backdrop-blur-md">
        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full uppercase tracking-wider mb-3">
          {card.tipe}
        </span>
        <h2 className="text-3xl font-black text-white leading-tight">
          {lang === 'id' ? checkpoint?.nama_id : checkpoint?.nama_en}
        </h2>
      </div>

      <div className="w-56 h-72 rounded-2xl shadow-2xl overflow-hidden border-4 border-white bg-slate-100 flex items-center justify-center">
        {card.ikon_url ? (
          <img src={card.ikon_url} alt="Card" className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-400 font-medium">[{t('Gambar', 'Image')}]</div>
        )}
      </div>

      <p className="text-slate-600 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        {lang === 'id' ? checkpoint?.reveal_id : checkpoint?.reveal_en}
      </p>

      <button 
        onClick={onClose}
        className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {t('Simpan ke Inventory', 'Save to Inventory')}
        <ArrowRight size={20} />
      </button>
    </div>
  );
}

function InventoryView({ gameData, progress, t, lang }: any) {
  const types = Array.from(new Set(gameData.cards.map((c: any) => c.tipe)));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Koleksi Kartu dengan Glassmorphism */}
      <div className="text-center rounded-2xl border border-white/30 bg-white/15 px-6 py-5 shadow-xl backdrop-blur-md">
        <h2 className="text-2xl font-black text-white">{t('Koleksi Kartu', 'Card Collection')}</h2>
        <p className="text-slate-100 text-sm mt-1">
          {progress.collectedCards.length} / {gameData.cards.length} {t('Terkumpul', 'Collected')}
        </p>
      </div>

      {/* Terpisah Per-section (Skill, Bonus, Riset, dll) */}
      {types.map((type: any) => (
        <div 
          key={type} 
          className="rounded-2xl border border-white/30 bg-slate-950/35 p-4 shadow-xl backdrop-blur-xl space-y-3"
        >
          {/* Judul Section (Warna Putih + Capitalize) */}
          <h3 className="font-bold text-white capitalize text-base tracking-wide border-b border-white/10 pb-2">
            {type}
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {gameData.cards.filter((c: any) => c.tipe === type).map((card: any) => {
              const isCollected = progress.collectedCards.includes(card.id);
              const checkpoint = gameData.checkpoints.find((cp: any) => cp.id === card.checkpoint_id);
              return (
                <div 
                  key={card.id} 
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden transition-all ${
                    isCollected 
                      ? 'shadow-md border border-white/40' 
                      : 'bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm'
                  }`}
                >
                  {isCollected ? (
                    <>
                      {card.ikon_url ? (
                        <img src={card.ikon_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                          <div className="w-8 h-8 bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                            ✓
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pt-5 pb-1.5">
                        <span className="text-[10px] font-bold leading-tight text-white line-clamp-2">
                          {lang === 'id' ? checkpoint?.nama_id : checkpoint?.nama_en}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="font-bold text-2xl text-white/40">?</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlueprintView({ gameData, progress, onBackToMap, t, lang }: any) {
  const idea = gameData.ideas.find((i: any) => i.id === progress.ideaId);
  
  let baseScore = progress.collectedCards.length;
  let tagMatches = 0;
  
  if (idea && idea.tag_dibutuhkan) {
    progress.collectedCards.forEach((cardId: string) => {
      const card = gameData.cards.find((c: any) => c.id === cardId);
      if (card && card.tags) {
        const hasMatch = card.tags.some((tag: string) => idea.tag_dibutuhkan.includes(tag));
        if (hasMatch) {
          tagMatches += 1;
        }
      }
    });
  }
  
  const totalScore = baseScore + tagMatches;
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <h2 className="text-white/80 font-medium text-sm mb-1">{t('Blueprint Inovasi', 'Innovation Blueprint')}</h2>
        <h3 className="text-2xl font-black mb-4">{lang === 'id' ? idea?.nama_id : idea?.nama_en}</h3>
        
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
          <div className="text-sm text-white/80 mb-1">{t('Total Skor', 'Total Score')}</div>
          <div className="text-4xl font-black text-amber-400">{totalScore}</div>
          {tagMatches > 0 && (
             <div className="text-xs text-amber-200 mt-1 font-medium">
               +{tagMatches} {t('Bonus Kecocokan Ide!', 'Idea Match Bonus!')}
             </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h4 className="font-bold text-slate-800 mb-3">{t('Komponen Terpasang', 'Installed Components')}</h4>
        {progress.collectedCards.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-4">
            {t('Belum ada kartu terkumpul', 'No cards collected yet')}
          </p>
        ) : (
          <div className="space-y-3">
            {progress.collectedCards.map((cardId: string) => {
              const card = gameData.cards.find((c: any) => c.id === cardId);
              if (!card) return null;
              const checkpoint = gameData.checkpoints.find((cp: any) => cp.id === card.checkpoint_id);
              return (
                <div key={card.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-xs font-bold text-blue-600">
                    {card.tipe.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">{lang === 'id' ? checkpoint?.nama_id : checkpoint?.nama_en}</div>
                    <div className="text-xs text-slate-500">{card.tipe}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <button 
        onClick={onBackToMap}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
      >
        <Map size={20} />
        {t('Kembali ke Peta Kawasan', 'Back to Area Map')}
      </button>
    </div>
  );
}
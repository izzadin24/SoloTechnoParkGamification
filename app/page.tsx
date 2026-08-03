'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GameData, fetchGameData, getTargetCheckpointsForIdea } from '../lib/data';
import { supabase } from '../lib/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Map, ScanLine, LayoutGrid, Hammer, X, Check, ArrowRight, Lock, Star, Plus, Minus, 
  RotateCcw, Building, QrCode, Compass, Keyboard, HelpCircle, Target, Sparkles, Info, 
  CheckCircle2, ChevronRight, RefreshCw, Award
} from 'lucide-react';

import snapshotData from '../data/snapshot.json';
import mapImage from '../imageclip_opt.webp';
import pageBackground from '../gedung-solo-technopark_169.jpeg';

type ViewState = 'landing' | 'map' | 'scanner' | 'teaser' | 'reveal' | 'inventory' | 'blueprint';
type Lang = 'id' | 'en';

interface PlayerProgress {
  ideaId: string | null;
  scannedCheckpoints: string[];
  collectedCards: string[];
  lastVisitedCheckpointId: string | null;
}

interface StatQueueItem {
  checkpoint_id: string;
  terakhir_update: string;
}



export default function GameApp() {
  const [view, setView] = useState<ViewState>('landing');
  const [lang, setLang] = useState<Lang>('id');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>({
    ideaId: null,
    scannedCheckpoints: [],
    collectedCards: [],
    lastVisitedCheckpointId: null
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

  const handleSelectIdea = (ideaId: string) => {
    setProgress(prev => ({ ...prev, ideaId }));
  };

  const handleScanSuccess = (decodedText: string) => {
    if (!gameData) return;
    
    const checkpoint = gameData.checkpoints.find(c => c.kode_qr === decodedText);
    if (!checkpoint) {
      alert(lang === 'id' ? 'QR tidak valid' : 'Invalid QR');
      return;
    }

    if (checkpoint.status_akses === 'dilarang') {
      alert(lang === 'id' 
        ? 'Area ini tidak boleh dikunjungi. Checkpoint tidak tersedia di sini.' 
        : 'This area is off-limits. No checkpoint is available here.');
      setView('map');
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

    setProgress(prev => ({
      ...prev,
      lastVisitedCheckpointId: checkpoint.id
    }));
    
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
      className="fixed inset-0 w-full h-full bg-slate-50 text-slate-900 font-sans overflow-hidden flex flex-col"
      style={{
        backgroundImage: `url(${pageBackground.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="w-full h-full bg-slate-950/55 backdrop-blur-[2px] flex flex-col overflow-hidden relative">
        {/* Top Header Bar for non-map sub-pages */}
        {view !== 'landing' && view !== 'map' && (
          <header className="shrink-0 h-12 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 flex justify-between items-center shadow-sm">
            <div className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <span>Jelajah STP</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHowToPlay(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-all"
              >
                <HelpCircle size={14} />
                <span>{t('Bantuan', 'Help')}</span>
              </button>

              {/* Language Switcher */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setLang('id')} 
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${lang === 'id' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  ID
                </button>
                <button 
                  onClick={() => setLang('en')} 
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  EN
                </button>
              </div>

              <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                {view === 'inventory' ? t('Kartu', 'Cards') : view === 'blueprint' ? 'Blueprint' : view === 'scanner' ? 'Scanner' : view}
              </div>
            </div>
          </header>
        )}

        <main className={view === 'map' ? "flex-1 w-full relative overflow-hidden flex flex-col" : "flex-1 w-full max-w-md mx-auto p-4 pb-4 overflow-y-auto flex flex-col transition-all duration-300 ease-out"}>
          {view === 'landing' && (
            <div className="animate-in fade-in duration-300">
              <LandingView 
                lang={lang} 
                setLang={setLang} 
                gameData={gameData}
                isLoading={isLoading}
                error={error}
                onStart={handleStart}
                onOpenHowToPlay={() => setShowHowToPlay(true)}
                t={t}
              />
            </div>
          )}
          
          {view === 'map' && gameData && (
            <div className="h-full w-full animate-in fade-in duration-300">
              <MapView 
                gameData={gameData} 
                progress={progress} 
                onScan={() => setView('scanner')} 
                onScanManual={handleScanSuccess}
                onOpenHowToPlay={() => setShowHowToPlay(true)}
                t={t} 
                lang={lang}
                setLang={setLang}
              />
            </div>
          )}
          
          {view === 'scanner' && (
            <div className="animate-in fade-in duration-300">
              <ScannerView 
                onSuccess={handleScanSuccess} 
                onCancel={() => setView('map')} 
                t={t}
                lang={lang}
              />
            </div>
          )}

          {view === 'teaser' && currentScan && gameData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <TeaserView 
                card={gameData.cards.find(c => c.id === currentScan.cardId)!} 
                onContinue={claimCard} 
                t={t}
                lang={lang}
              />
            </div>
          )}

          {view === 'reveal' && currentScan && gameData && (
            <div className="animate-in zoom-in-90 duration-400">
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
            </div>
          )}

          {view === 'inventory' && gameData && (
            <div key="inventory-view" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <InventoryView 
                gameData={gameData} 
                progress={progress} 
                onBackToMap={() => setView('map')}
                t={t}
                lang={lang}
              />
            </div>
          )}

          {view === 'blueprint' && gameData && progress.ideaId && (
            <div key="blueprint-view" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <BlueprintView 
                gameData={gameData} 
                progress={progress} 
                onBackToMap={() => setView('map')}
                onSelectIdea={handleSelectIdea}
                onOpenHowToPlay={() => setShowHowToPlay(true)}
                t={t}
                lang={lang}
              />
            </div>
          )}
        </main>

        {showHowToPlay && (
          <HowToPlayModal
            onClose={() => setShowHowToPlay(false)}
            t={t}
            lang={lang}
          />
        )}

        {/* Fixed Non-overlapping Bottom Navigation Bar */}
        {view !== 'landing' && (
          <nav className="shrink-0 h-16 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl flex justify-center items-center select-none z-40">
            <div className="max-w-md w-full h-full grid grid-cols-3 items-center">
              <button
                type="button"
                onClick={() => setView('map')}
                className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-all ${
                  view === 'map' ? 'text-blue-600 font-black scale-105' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Map size={22} strokeWidth={view === 'map' ? 2.5 : 2} />
                <span className="text-[10px] tracking-wider uppercase font-black leading-none text-center">{t('PETA', 'MAP')}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setView('inventory')}
                className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-all ${
                  view === 'inventory' ? 'text-blue-600 font-black scale-105' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <LayoutGrid size={22} strokeWidth={view === 'inventory' ? 2.5 : 2} />
                <span className="text-[10px] tracking-wider uppercase font-black leading-none text-center">{t('KARTU', 'CARDS')}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setView('blueprint')}
                className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-all ${
                  view === 'blueprint' ? 'text-blue-600 font-black scale-105' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Hammer size={22} strokeWidth={view === 'blueprint' ? 2.5 : 2} />
                <span className="text-[10px] tracking-wider uppercase font-black leading-none text-center">BLUEPRINT</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTS
// ==========================================

function HowToPlayModal({ onClose, t, lang }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-300 text-slate-800">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <HelpCircle size={28} />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black text-slate-900 leading-tight">{t('Cara Bermain', 'How to Play')}</h2>
            <p className="text-xs text-slate-500">{t('Petualangan Inovasi Solo Technopark', 'Solo Technopark Innovation Quest')}</p>
          </div>
        </div>

        <div className="space-y-3.5 text-left">
          {/* Step 1 */}
          <div className="flex gap-3.5 p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
              1
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('Pilih Blueprint Target', 'Select Target Blueprint')}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t('Pilih salah satu ide inovasi produk yang ingin kamu rancang. Setiap blueprint membutuhkan checkpoint gedung khusus di kawasan.', 'Choose an innovation idea at the start. Each blueprint requires specific building checkpoints across the park.')}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3.5 p-3.5 bg-amber-50/80 border border-amber-100 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
              2
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('Jelajah & Scan QR Code', 'Explore & Scan QR Code')}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t('Perhatikan pin target (🎯) pada peta interaktif. Kunjungi gedung di Solo Technopark dan scan QR code di lokasi untuk mengklaim kartu.', 'Look for target pins (🎯) on the interactive map. Visit real buildings at Solo Technopark and scan QR codes to claim cards.')}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3.5 p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
              3
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('Kumpulkan & Rakit Inovasi', 'Collect & Assemble Innovation')}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t('Setiap checkpoint memberikan Kartu Skill/Riset. Kumpulkan semua target untuk melengkapi blueprint dan tingkatkan skor inovasimu!', 'Each checkpoint grants a Skill/Research card. Collect all targets to complete your blueprint and maximize your score!')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-base shadow-lg transition-all cursor-pointer"
        >
          {t('Saya Mengerti, Mulai!', 'I Understand, Let\'s Go!')}
        </button>
      </div>
    </div>
  );
}

function LandingView({ lang, setLang, gameData, isLoading, error, onStart, onOpenHowToPlay, t }: any) {
  const ideas = gameData?.ideas || [];
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);

  useEffect(() => {
    if (ideas.length > 0 && !selectedIdea) {
      setSelectedIdea(ideas[0].id);
    }
  }, [ideas, selectedIdea]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-5 pb-6">
      {/* App Main Banner */}
      <div className="w-full rounded-3xl border border-white/30 bg-white/15 px-6 py-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-blue-400/20 rounded-full blur-xl pointer-events-none"></div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">
          Jelajah Solo Technopark
        </h1>
        <p className="text-slate-200 text-xs font-medium max-w-xs mx-auto">
          {t(
            'Jelajah kawasan, temukan checkpoint, dan wujudkan ide inovasimu!',
            'Explore the park, discover checkpoints, and build your innovation idea!'
          )}
        </p>

        {/* 3-Step Gamification Flow Loop Pill */}
        <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-white/20 text-[11px] font-bold text-amber-300 shadow-inner">
          <span>🏛️ {t('Jelajah Gedung', 'Explore')}</span>
          <ChevronRight size={12} className="text-white/60" />
          <span>📱 {t('Scan QR', 'Scan QR')}</span>
          <ChevronRight size={12} className="text-white/60" />
          <span>⚡ {t('Rakit Inovasi', 'Build Innovation')}</span>
        </div>
      </div>

      {/* Control Bar: Language Switcher & How to Play Button */}
      <div className="w-full flex items-center justify-between gap-3">
        {/* Language Switcher */}
        <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-white/20 shadow-md">
          <button 
            type="button"
            onClick={() => setLang('id')} 
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${lang === 'id' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            ID
          </button>
          <button 
            type="button"
            onClick={() => setLang('en')} 
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            EN
          </button>
        </div>

        {/* How to Play Button */}
        <button
          type="button"
          onClick={onOpenHowToPlay}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/90 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-2xl border border-amber-300/50 shadow-lg transition-all cursor-pointer"
        >
          <HelpCircle size={15} strokeWidth={2.5} />
          <span>{t('Cara Bermain', 'How to Play')}</span>
        </button>
      </div>

      {/* Product Blueprint Selector Card */}
      <div className="w-full rounded-3xl border border-white/25 bg-slate-950/45 p-5 text-left shadow-2xl backdrop-blur-xl space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg text-white flex items-center gap-2">
              <Target size={18} className="text-amber-400" />
              <span>{t('Pilih Blueprint Target:', 'Choose Target Blueprint:')}</span>
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-md border border-amber-400/30">
              {ideas.length} {t('Opsi', 'Options')}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {t(
              'Pilihan ini menentukan gedung checkpoint mana yang harus kamu kunjungi.',
              'This choice determines which building checkpoints you need to visit.'
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 rounded-2xl border border-white/20 bg-white/80 text-center text-slate-600 animate-pulse">
            {t('Memuat data ide...', 'Loading ideas data...')}
          </div>
        ) : ideas.length > 0 ? (
          <div className="grid gap-2.5">
            {ideas.map((idea: any) => {
              const isSelected = selectedIdea === idea.id;
              const reqCheckpoints = getTargetCheckpointsForIdea(idea.id, gameData);
              return (
                <div 
                  key={idea.id} 
                  onClick={() => setSelectedIdea(idea.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-amber-400 bg-gradient-to-r from-blue-700/90 to-blue-900/90 text-white shadow-xl ring-2 ring-amber-400/50 translate-x-1' 
                      : 'border-white/15 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-base leading-tight">
                      {lang === 'id' ? idea.nama_id : idea.nama_en}
                    </h3>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-amber-400 bg-amber-400 text-slate-900 font-bold text-xs' : 'border-white/40'}`}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>

                  {/* Expanded Description & Target Checkpoints Info */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-white/20 text-xs space-y-2 animate-in fade-in duration-200">
                      <p className="text-blue-100 font-medium leading-relaxed">
                        {lang === 'id' ? (idea.deskripsi_id || idea.nama_id) : (idea.deskripsi_en || idea.nama_en)}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                          🎯 {t('Target', 'Target')}:
                        </span>
                        {reqCheckpoints.map((cp: any) => (
                          <span key={cp.id} className="px-2 py-0.5 rounded-full bg-slate-900/70 text-[10px] text-white border border-white/20 font-bold">
                            {lang === 'id' ? cp.nama_id : cp.nama_en}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-red-200/70 bg-red-50/90 text-red-700 text-sm">
            {error || t('Gagal memuat data ide', 'Failed to load ideas')}
          </div>
        )}
      </div>

      {/* Start Playing Button */}
      <button 
        onClick={() => selectedIdea && onStart(selectedIdea)}
        disabled={isLoading || !selectedIdea}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-lg shadow-2xl hover:brightness-110 active:scale-95 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 group cursor-pointer"
      >
        <span>{isLoading ? t('Memuat...', 'Loading...') : t('Mulai Petualangan', 'Start Adventure')}</span>
        <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

function MapView({ gameData, progress, onScan, onScanManual, onOpenHowToPlay, t, lang, setLang }: any) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isCheckpointPopupVisible, setIsCheckpointPopupVisible] = useState(false);
  
  const targetCheckpoints = getTargetCheckpointsForIdea(progress.ideaId, gameData);
  const targetCheckpointIds = targetCheckpoints.map((cp: any) => cp.id);
  const activeIdea = gameData?.ideas?.find((i: any) => i.id === progress.ideaId);
  const scannedTargetCount = targetCheckpoints.filter((cp: any) => progress.scannedCheckpoints.includes(cp.id)).length;

  // Direct refs for 60FPS GPU hardware acceleration without React re-render overhead
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const touchStateRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContentRef = useRef<HTMLDivElement>(null);
  const zoomBadgeRef = useRef<HTMLDivElement>(null);
  const popupTimeoutRef = useRef<number | null>(null);
  const zoomTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedCheckpoint) {
      setIsCheckpointPopupVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsCheckpointPopupVisible(true), 10);
    return () => window.clearTimeout(timer);
  }, [selectedCheckpoint]);

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

  // Ultra-fast GPU hardware layer transform update (0 React re-renders during active gestures)
  const applyTransform = () => {
    if (mapContentRef.current) {
      mapContentRef.current.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${scaleRef.current})`;
    }
    if (zoomBadgeRef.current) {
      zoomBadgeRef.current.textContent = `${Math.round(scaleRef.current * 100)}%`;
      zoomBadgeRef.current.style.opacity = '1';
      if (zoomTimeoutRef.current) {
        window.clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = window.setTimeout(() => {
        if (zoomBadgeRef.current) {
          zoomBadgeRef.current.style.opacity = '0';
        }
      }, 1200);
    }
  };

  const scheduleUpdate = () => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        applyTransform();
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
    <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 select-none touch-none animate-in fade-in duration-300">
      {/* Top Floating App Header & Active Blueprint Objective */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-1.5 rounded-2xl shadow-xl font-black text-slate-800 text-sm flex items-center gap-2">
            <Map className="text-blue-600" size={18} />
            <span>Jelajah STP</span>
          </div>

          <div className="flex items-center gap-2">
            {/* How to Play Help Button */}
            <button 
              type="button"
              onClick={onOpenHowToPlay} 
              className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 px-3 py-1.5 rounded-2xl font-black text-xs shadow-xl border border-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle size={14} strokeWidth={2.5} />
              <span>{t('Petunjuk', 'Guide')}</span>
            </button>

            {/* Language Switcher */}
            <div className="flex bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-xl">
              <button 
                type="button"
                onClick={() => setLang('id')} 
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                  lang === 'id' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ID
              </button>
              <button 
                type="button"
                onClick={() => setLang('en')} 
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                  lang === 'en' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Active Blueprint Target Banner */}
        {activeIdea && (
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-amber-400/50 px-3.5 py-2 rounded-2xl shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Target size={16} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 truncate">
                  🎯 {t('Blueprint', 'Blueprint')}: {lang === 'id' ? activeIdea.nama_id : activeIdea.nama_en}
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {scannedTargetCount} / {targetCheckpoints.length} {t('Checkpoint Target Selesai', 'Target Checkpoints Done')}
                </div>
              </div>
            </div>

            <div className="shrink-0 pl-2">
              <div className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                {Math.round((scannedTargetCount / (targetCheckpoints.length || 1)) * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Viewport Peta Full-Bleed Center */}
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-slate-900 touch-none select-none flex items-center justify-center"
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
          className="origin-center flex items-center justify-center min-w-full min-h-full"
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
              className="max-w-full max-h-[85vh] object-contain cursor-grab pointer-events-none block bg-transparent drop-shadow-none"
              draggable={false}
              style={{ imageRendering: 'auto' }}
            />

            {/* RENDER PIN CHECKPOINT DENGAN WARNA DINAMIS & BLUEPRINT TARGET */}
            {gameData?.checkpoints?.map((cp: any) => {
              const isScanned = progress.scannedCheckpoints.includes(cp.id);
              const isLastVisited = progress.lastVisitedCheckpointId === cp.id;
              const isRestricted = cp.status_akses === 'dilarang';
              const isTarget = targetCheckpointIds.includes(cp.id);
              const posX = cp.posisi_x ?? 50;
              const posY = cp.posisi_y ?? 50;
              
              const zoneColor = getZoneColor(cp.zona_id);
              const restrictedLabel = t('Area terlarang - tidak boleh dikunjungi', 'Restricted area - off-limits');
              const pinLabel = lang === 'id' ? cp.nama_id : cp.nama_en;

              return (
                <div
                  key={cp.id}
                  onClick={() => {
                    setSelectedCheckpoint(cp);
                    setIsPopupVisible(true);
                    setIsCheckpointPopupVisible(true);
                    if (popupTimeoutRef.current) {
                      window.clearTimeout(popupTimeoutRef.current);
                    }
                    popupTimeoutRef.current = window.setTimeout(() => {
                      setIsPopupVisible(false);
                      window.setTimeout(() => {
                        setIsCheckpointPopupVisible(false);
                        setSelectedCheckpoint(null);
                      }, 180);
                    }, 2500);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform ${
                    isRestricted ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-125 active:scale-110'
                  }`}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  title={isRestricted ? `${pinLabel} — ${restrictedLabel}` : isTarget ? `🎯 TARGET BLUEPRINT: ${pinLabel}` : pinLabel}
                >
                  {/* Target Badge Icon */}
                  {isTarget && !isScanned && (
                    <div className="absolute -top-3 -right-3 z-20 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce border border-amber-200">
                      🎯
                    </div>
                  )}

                  {isRestricted ? (
                    <div className={`w-6 h-6 bg-slate-700 border-2 border-red-400 rounded-full shadow-md flex items-center justify-center active:scale-90 transition-transform ${isLastVisited ? 'animate-bounce' : ''}`}>
                      <Lock size={11} className="text-red-300" strokeWidth={2.5} />
                    </div>
                  ) : isScanned ? (
                    <div className={`w-7 h-7 ${isTarget ? 'bg-emerald-500 ring-4 ring-amber-400 shadow-amber-500/50' : 'bg-emerald-500'} border-2 border-white text-white rounded-full flex items-center justify-center shadow-lg ${isLastVisited ? 'animate-bounce' : ''}`}>
                      <Check size={16} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 ${zoneColor.bg} border-2 border-white rounded-full shadow-md flex items-center justify-center ${isTarget ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 animate-pulse shadow-xl shadow-amber-400/60 scale-110' : ''} ${isLastVisited ? 'animate-bounce' : ''}`}>
                      <div className={`w-2 h-2 ${zoneColor.dot} rounded-full`}></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Checkpoint Popup Overlay */}
        {selectedCheckpoint && (
          <div className={`absolute left-4 top-28 z-40 max-w-[calc(100%-2rem)] sm:max-w-xs rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${isCheckpointPopupVisible && isPopupVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}>
            <div className="flex items-start gap-2.5">
              <Building size={18} className="mt-0.5 text-blue-600 shrink-0" />
              <div>
                {targetCheckpointIds.includes(selectedCheckpoint.id) && (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md mb-1 border border-amber-300 uppercase tracking-wider">
                    🎯 {t('Target Blueprint Kamu!', 'Your Blueprint Target!')}
                  </span>
                )}
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  {t('Bangunan / area', 'Building / area')}
                </p>
                <p className="font-extrabold text-slate-800 text-sm">
                  {selectedCheckpoint.status_akses === 'dilarang'
                    ? t('Bangunan dalam pemeliharaan atau berbahaya', 'Building under maintenance or dangerous')
                    : progress.scannedCheckpoints.includes(selectedCheckpoint.id)
                      ? (lang === 'id' ? selectedCheckpoint.nama_id : selectedCheckpoint.nama_en)
                      : t('Informasi belum diketahui', 'Information unknown')}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedCheckpoint.status_akses === 'dilarang'
                    ? t('Area ini tidak dapat dikunjungi saat ini.', 'This area is currently not accessible.')
                    : progress.scannedCheckpoints.includes(selectedCheckpoint.id)
                      ? `${t('Zona', 'Zone')}: ${gameData.zones.find((zone: any) => zone.id === selectedCheckpoint.zona_id)?.[lang === 'id' ? 'nama_id' : 'nama_en'] || '-'}`
                      : t('Kunjungi checkpoint ini terlebih dahulu untuk melihat informasi bangunan.', 'Visit this checkpoint first to reveal building information.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Floating Mobile/Touch Controls at Bottom Left (Reset Map + Zoom Controls) */}
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2">
          {/* Reset Map Button (Round Compass Needle) */}
          <button
            onClick={handleResetZoom}
            className="relative w-11 h-11 bg-slate-900/90 hover:bg-slate-800 active:scale-90 text-white rounded-full flex items-center justify-center border border-white/20 shadow-xl backdrop-blur-md transition-all group"
            title={t('Reset Zoom / Peta', 'Reset Zoom / Map')}
          >
            <Compass size={22} className="text-amber-400 group-hover:rotate-45 transition-transform" />
            <span className="absolute top-0.5 text-[8px] font-black text-amber-300">N</span>
          </button>

          {/* Zoom Controls Pill Adjacent to Reset Button */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-full border border-white/20 shadow-xl p-1">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-white/20 active:bg-white/30 text-white rounded-full transition-all"
              title={t('Perbesar', 'Zoom In')}
            >
              <Plus size={18} />
            </button>
            <div className="w-px h-4 bg-white/20 my-auto"></div>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-white/20 active:bg-white/30 text-white rounded-full transition-all"
              title={t('Perkecil', 'Zoom Out')}
            >
              <Minus size={18} />
            </button>
          </div>

          {/* Zoom Level Badge (Direct Ref DOM manipulation for 60FPS zero React re-render overhead) */}
          <div
            ref={zoomBadgeRef}
            className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[11px] font-bold text-white shadow-md transition-opacity duration-300 opacity-0 pointer-events-none"
          >
            100%
          </div>
        </div>

        {/* Floating Action Button (FAB) for Scanning QR at Bottom Right */}
        <div className="absolute bottom-4 right-4 z-30">
          <button
            onClick={onScan}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-500 active:scale-90 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white transition-all cursor-pointer"
            title={t('Scan QR Checkpoint', 'Scan Checkpoint QR')}
          >
            <QrCode size={26} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ScannerView({ onSuccess, onCancel, t, lang }: any) {
  const [manualCode, setManualCode] = useState('');

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
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm text-slate-600 hover:text-slate-900 active:scale-95"
        >
          <X size={20} />
        </button>
        
        <div className="p-4 bg-slate-900 text-white text-center">
          <h2 className="font-bold text-base">{t('Scan QR Checkpoint', 'Scan Checkpoint QR')}</h2>
          <p className="text-xs text-slate-300 mt-0.5">{t('Arahkan kamera ke QR Code', 'Point camera at QR Code')}</p>
        </div>
        
        <div id="qr-reader" className="w-full"></div>

        {/* Integrated Manual Code Input Section */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            {t('Kamera bermasalah / Masukkan ID Manual:', 'Camera issue / Enter Manual ID:')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('Masukkan ID (contoh: STP-Z1-01)', 'Enter ID (e.g. STP-Z1-01)')}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  onSuccess(manualCode.trim());
                }
              }}
              className="flex-1 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 shadow-sm"
            />
            <button
              onClick={() => {
                if (manualCode.trim()) {
                  onSuccess(manualCode.trim());
                }
              }}
              className="px-4 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shrink-0"
            >
              {t('Kirim', 'Submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeaserView({ card, onContinue, t, lang }: any) {
  return (
    <div className="flex min-h-[66vh] flex-col items-center justify-start pt-3 text-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-full rounded-2xl border border-white/30 bg-white/15 px-6 py-5 shadow-xl backdrop-blur-md">
        <h2 className="text-2xl font-black text-white">{t('Data Ditemukan!', 'Data Found!')}</h2>
        <p className="text-slate-100 mt-1">{t('Mengekstrak informasi...', 'Extracting information...')}</p>
      </div>

      <div className="w-[12.5rem] aspect-[3/4] rounded-[1.75rem] border-4 border-white/80 bg-slate-200 shadow-2xl shadow-slate-950/20 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-300/50 to-transparent"></div>
        <span className="text-slate-400 font-black text-4xl">?</span>
      </div>

      <button 
        onClick={onContinue}
        className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all duration-300 hover:-translate-y-0.5"
      >
        {t('Buka Kartu', 'Reveal Card')}
      </button>
    </div>
  );
}

function RevealView({ card, checkpoint, onClose, t, lang }: any) {
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsRevealing(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[66vh] flex-col items-center justify-start pt-3 text-center space-y-5 animate-in zoom-in-90 duration-500">
      <div className="w-full text-center rounded-2xl border border-white/30 bg-white/15 px-6 py-5 shadow-xl backdrop-blur-md">
        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full uppercase tracking-wider mb-3">
          {card.tipe}
        </span>
        <h2 className="text-3xl font-black text-white leading-tight">
          {lang === 'id' ? checkpoint?.nama_id : checkpoint?.nama_en}
        </h2>
      </div>

      <div className="relative">
        <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br from-amber-300/70 via-yellow-100/50 to-sky-300/70 blur-xl transition-all duration-500 ${isRevealing ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}`} />
        <div className={`relative w-[13rem] aspect-[3/4] rounded-[1.75rem] shadow-2xl overflow-hidden border-4 border-white bg-slate-100 flex items-center justify-center p-4 transition-all duration-700 ${isRevealing ? 'scale-100 rotate-[720deg]' : 'scale-0 rotate-[-180deg]'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-slate-200/40" />
          <div className="absolute top-3 right-3 h-8 w-8 rounded-full border-2 border-amber-400/40 bg-white/90 animate-spin" />
          <div className={`transition-all duration-500 ${isRevealing ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            {card.ikon_url ? (
              <img src={card.ikon_url} alt="Card" className="h-full w-full object-contain" />
            ) : (
              <div className="text-slate-400 font-medium">[{t('Gambar', 'Image')}]</div>
            )}
          </div>
        </div>
      </div>

      <p className="w-full text-slate-600 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        {lang === 'id' ? checkpoint?.reveal_id : checkpoint?.reveal_en}
      </p>

      <button 
        onClick={onClose}
        className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl hover:bg-slate-800 active:scale-95 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
      >
        {t('Simpan ke Inventory', 'Save to Inventory')}
        <ArrowRight size={20} />
      </button>
    </div>
  );
}

function InventoryView({ gameData, progress, onBackToMap, t, lang }: any) {
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const types = Array.from(new Set(gameData.cards.map((c: any) => c.tipe)));

  const selectedCheckpoint = selectedCard
    ? gameData.checkpoints.find((cp: any) => cp.id === selectedCard.checkpoint_id)
    : null;

  useEffect(() => {
    if (!selectedCard) {
      setIsCardModalVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsCardModalVisible(true), 20);
    return () => window.clearTimeout(timer);
  }, [selectedCard]);

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
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCard(card)}
                  className={`aspect-[3/4] rounded-xl flex flex-col p-2 text-center transition-all duration-300 ${
                    isCollected 
                      ? 'bg-white/90 shadow-md border border-white text-slate-900 hover:scale-[1.03] hover:-translate-y-1 animate-pulse' 
                      : 'bg-white/10 border border-dashed border-white/30 text-white/50 backdrop-blur-sm items-center justify-center hover:bg-white/15 hover:scale-[1.02] hover:-translate-y-0.5'
                  }`}
                >
                  {isCollected ? (
                    <>
                      <div className="flex-1 min-h-0 flex items-center justify-center">
                        {card.ikon_url ? (
                          <img src={card.ikon_url} alt="" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <div className="w-12 h-12 bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                            ✓
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold leading-tight text-slate-800 mt-1.5 shrink-0">
                        {lang === 'id' ? checkpoint?.nama_id : checkpoint?.nama_en}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-2xl text-white/40">?</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={onBackToMap}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all duration-300 hover:-translate-y-0.5"
      >
        <Map size={20} />
        {t('Kembali ke Peta Kawasan', 'Back to Area Map')}
      </button>

      {selectedCard && (
        <div
          className={`fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-3 pt-4 sm:p-4 sm:pt-6 transition-all duration-300 ${isCardModalVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => {
            setIsCardModalVisible(false);
            window.setTimeout(() => setSelectedCard(null), 180);
          }}
        >
          <div
            className={`w-full max-w-[20rem] rounded-[1.75rem] bg-white p-4 shadow-2xl transition-all duration-300 ${isCardModalVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {selectedCard.tipe}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-900">
                  {lang === 'id' ? selectedCheckpoint?.nama_id : selectedCheckpoint?.nama_en}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCardModalVisible(false);
                  window.setTimeout(() => setSelectedCard(null), 180);
                }}
                className="rounded-full bg-slate-100 p-2 text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 aspect-[3/4] rounded-[1.5rem] bg-slate-100 p-3 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200/70 via-white/20 to-blue-100/70 blur-xl opacity-80" />
              {selectedCard.ikon_url ? (
                <img src={selectedCard.ikon_url} alt="Card" className="relative h-full w-full object-contain rounded-2xl transition-transform duration-500 hover:scale-[1.04]" />
              ) : (
                <div className="relative text-slate-400 font-medium">[{t('Gambar', 'Image')}]</div>
              )}
            </div>

            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 leading-6 transition-all duration-300 hover:bg-slate-100">
              {progress.collectedCards.includes(selectedCard.id)
                ? (lang === 'id' ? selectedCheckpoint?.reveal_id : selectedCheckpoint?.reveal_en)
                : t('Kartu ini belum terkumpul', 'This card has not been collected yet')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BlueprintView({ gameData, progress, onBackToMap, onSelectIdea, onOpenHowToPlay, t, lang }: any) {
  const idea = gameData.ideas.find((i: any) => i.id === progress.ideaId);
  const [isChangingIdea, setIsChangingIdea] = useState(false);
  
  const targetCheckpoints = getTargetCheckpointsForIdea(progress.ideaId, gameData);
  const scannedTargetCount = targetCheckpoints.filter((cp: any) => progress.scannedCheckpoints.includes(cp.id)).length;
  const progressPercent = Math.round((scannedTargetCount / (targetCheckpoints.length || 1)) * 100);

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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-6">
      {/* Main Blueprint Card */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-white/20">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-amber-300 font-extrabold text-xs uppercase tracking-wider bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
            <Target size={14} />
            {t('Blueprint Inovasi Target', 'Target Innovation Blueprint')}
          </span>

          <button
            onClick={() => setIsChangingIdea(!isChangingIdea)}
            className="text-xs text-blue-200 hover:text-white underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>{t('Ganti Blueprint', 'Change Blueprint')}</span>
          </button>
        </div>

        <h3 className="text-2xl font-black text-white leading-tight mb-2">
          {lang === 'id' ? idea?.nama_id : idea?.nama_en}
        </h3>

        <p className="text-xs text-slate-200 leading-relaxed mb-4 bg-white/10 p-3 rounded-2xl border border-white/10">
          {lang === 'id' ? (idea?.deskripsi_id || idea?.nama_id) : (idea?.deskripsi_en || idea?.nama_en)}
        </p>

        {/* Blueprint Target Completion Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-300">{t('Kemajuan Target Blueprint', 'Blueprint Target Progress')}</span>
            <span className="text-amber-400 font-extrabold">{scannedTargetCount} / {targetCheckpoints.length} Checkpoint ({progressPercent}%)</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500 shadow-lg shadow-amber-400/50"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/15">
            <div className="text-xs text-slate-300 font-medium mb-0.5">{t('Total Skor Inovasi', 'Total Score')}</div>
            <div className="text-3xl font-black text-amber-400">{totalScore}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/15">
            <div className="text-xs text-slate-300 font-medium mb-0.5">{t('Bonus Kecocokan', 'Match Bonus')}</div>
            <div className="text-3xl font-black text-emerald-400">+{tagMatches}</div>
          </div>
        </div>
      </div>

      {/* Switch Blueprint Drawer / Section */}
      {isChangingIdea && (
        <div className="bg-slate-900 text-white p-5 rounded-3xl border border-amber-400/40 shadow-2xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-amber-300">{t('Pilih Blueprint Baru:', 'Select New Blueprint:')}</h4>
            <button onClick={() => setIsChangingIdea(false)} className="text-slate-400 hover:text-white text-xs font-bold">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-2">
            {gameData.ideas.map((item: any) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectIdea(item.id);
                  setIsChangingIdea(false);
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  item.id === progress.ideaId
                    ? 'border-amber-400 bg-amber-400/20 text-white font-bold'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/15'
                }`}
              >
                <div className="font-bold text-sm">{lang === 'id' ? item.nama_id : item.nama_en}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {lang === 'id' ? item.deskripsi_id : item.deskripsi_en}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Target Checkpoints Required Section */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Target size={18} className="text-amber-500" />
              <span>{t('Gedung Target Blueprint', 'Blueprint Target Buildings')}</span>
            </h4>
            <span className="text-xs font-bold text-slate-500">
              {scannedTargetCount}/{targetCheckpoints.length} {t('Dikunjungi', 'Visited')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'Kunjungi gedung-gedung ini di Solo Technopark untuk mengumpulkan skill yang dibutuhkan blueprint.',
              'Visit these buildings at Solo Technopark to collect skills required for your blueprint.'
            )}
          </p>
        </div>

        <div className="space-y-2.5">
          {targetCheckpoints.map((cp: any) => {
            const isScanned = progress.scannedCheckpoints.includes(cp.id);
            const card = gameData.cards.find((c: any) => c.checkpoint_id === cp.id);
            const zone = gameData.zones.find((z: any) => z.id === cp.zona_id);
            
            return (
              <div 
                key={cp.id} 
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isScanned 
                    ? 'bg-emerald-50/80 border-emerald-200 text-slate-900 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-sm ${
                    isScanned ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isScanned ? <Check size={18} strokeWidth={3} /> : '🎯'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-slate-900 truncate">
                      {lang === 'id' ? cp.nama_id : cp.nama_en}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {lang === 'id' ? zone?.nama_id : zone?.nama_en} {card?.tags?.length ? `• Tag: ${card.tags.join(', ')}` : ''}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isScanned ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-xl border border-emerald-200">
                      ✓ {t('Terkumpul', 'Collected')}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-xl border border-amber-200 flex items-center gap-1">
                      <Lock size={11} />
                      <span>{t('Belum Visited', 'Not Visited')}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Installed Cards Section */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <h4 className="font-extrabold text-slate-900 text-base mb-3 flex items-center gap-2">
          <Award size={18} className="text-blue-600" />
          <span>{t('Semua Komponen Terpasang', 'All Installed Components')}</span>
        </h4>
        {progress.collectedCards.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            {t('Belum ada kartu terkumpul. Kunjungi checkpoint di peta!', 'No cards collected yet. Visit checkpoints on the map!')}
          </p>
        ) : (
          <div className="space-y-2.5">
            {progress.collectedCards.map((cardId: string) => {
              const card = gameData.cards.find((c: any) => c.id === cardId);
              if (!card) return null;
              const checkpoint = gameData.checkpoints.find((cp: any) => cp.id === card.checkpoint_id);
              const isTargetCard = targetCheckpoints.some((cp: any) => cp.id === card.checkpoint_id);
              return (
                <div key={card.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-xs font-black text-blue-600">
                      {card.tipe.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{lang === 'id' ? checkpoint?.nama_id : checkpoint?.nama_en}</div>
                      <div className="text-xs text-slate-500">{card.tipe}</div>
                    </div>
                  </div>
                  {isTargetCard && (
                    <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-300 uppercase">
                      🎯 {t('Target Match', 'Target Match')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <button 
        onClick={onBackToMap}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-bold text-base shadow-xl shadow-slate-900/20 active:scale-95 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
      >
        <Map size={20} />
        <span>{t('Kembali ke Peta Kawasan', 'Back to Area Map')}</span>
      </button>
    </div>
  );
}
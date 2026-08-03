'use client';

import React, { useState, useEffect } from 'react';
import { GameData, fetchGameData } from '../lib/data';
import { supabase } from '../lib/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Map, ScanLine, LayoutGrid, Hammer, X, Check, ArrowRight, Lock, Star } from 'lucide-react';

import snapshotData from '../data/snapshot.json';

type ViewState = 'landing' | 'map' | 'scanner' | 'teaser' | 'reveal' | 'inventory' | 'blueprint';
type Lang = 'id' | 'en';

interface PlayerProgress {
  ideaId: string | null;
  scannedCheckpoints: string[];
  collectedCards: string[];
}

// Queue for offline stats sending
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
  
  // Offline stats queue
  const [statQueue, setStatQueue] = useState<StatQueueItem[]>([]);

  // Load state from local storage on mount
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
        setGameData(snapshotData as GameData); // Initialize with snapshot immediately
      }

      // Silent background refresh
      try {
        const data = await fetchGameData();
        // Ensure data is valid before replacing
        if (data && data.zones.length > 0) {
          setGameData(data);
          localStorage.setItem('stp_gamedata', JSON.stringify(data));
          console.log('Background sync successful');
        }
      } catch (e) {
        console.warn('Background sync failed, using cached/snapshot data', e);
      }
    };
    
    loadInitialData();
  }, []);

  // Save progress and queue to local storage when changed
  useEffect(() => {
    localStorage.setItem('stp_progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('stp_statqueue', JSON.stringify(statQueue));
    processStatQueue();
  }, [statQueue]);

  // Online status listener
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

  const handleStart = async (selectedIdeaId: string) => {
    if (!gameData || gameData.ideas.length === 0) {
      setError(lang === 'id' ? 'Data ide belum termuat. Cek koneksi Supabase.' : 'Ideas data not loaded. Check Supabase connection.');
      return;
    }
    setProgress({ ...progress, ideaId: selectedIdeaId });
    setView('map');
  };

  const handleScanSuccess = (decodedText: string) => {
    if (!gameData) return;
    
    // Scan expects QR code to match kode_qr
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
    
    // Add to stat queue
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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
            t={t}
            lang={lang}
          />
        )}
      </main>
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
      <div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">Jelajah Solo Technopark</h1>
        <p className="text-slate-600">{t('Mulai petualangan inovasimu', 'Start your innovation journey')}</p>
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

      <div className="w-full text-left">
        <h2 className="font-bold text-lg mb-3">{t('Pilih Ide Produkmu:', 'Choose Your Product Idea:')}</h2>
        {isLoading ? (
          <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50 text-center text-slate-500 animate-pulse">
            {t('Memuat data dari Supabase...', 'Loading data from Supabase...')}
          </div>
        ) : ideas.length > 0 ? (
          <div className="grid gap-3">
            {ideas.map((idea: any) => (
              <div 
                key={idea.id} 
                onClick={() => setSelectedIdea(idea.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedIdea === idea.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
              >
                <h3 className="font-bold text-blue-900">{lang === 'id' ? idea.nama_id : idea.nama_en}</h3>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error || t('Gagal memuat data ide, cek koneksi Supabase', 'Failed to load ideas data, check Supabase connection')}
          </div>
        )}
      </div>

      {error && ideas.length > 0 && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm w-full">
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
  const [activeCheckpoint, setActiveCheckpoint] = useState<any>(null);

  const getZonePath = (zoneId: string) => {
    switch (zoneId) {
      case 'zona-1': return "M10,5 Q50,0 90,5 T95,20 Q80,25 50,30 T10,20 Q0,15 10,5 Z";
      case 'zona-2': return "M10,35 Q50,30 90,35 T95,50 Q80,55 50,60 T10,50 Q0,45 10,35 Z";
      case 'zona-3': return "M10,65 Q50,60 90,65 T95,80 Q80,85 50,90 T10,80 Q0,75 10,65 Z";
      default: return "";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="font-black text-xl mb-4">{t('Peta Kawasan', 'Area Map')}</h2>
        
        <div 
          className="w-full aspect-[4/5] bg-slate-50 rounded-xl relative overflow-hidden border-2 border-slate-200"
          onClick={() => setActiveCheckpoint(null)}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            {/* Zones */}
            {gameData.zones.map((zone: any) => (
              <path 
                key={zone.id} 
                d={getZonePath(zone.id)} 
                fill={zone.warna_tema || '#ccc'} 
                fillOpacity={0.15}
                stroke={zone.warna_tema || '#ccc'}
                strokeWidth="0.5"
              />
            ))}
            
            {/* Checkpoints */}
            {gameData.checkpoints.map((cp: any) => {
              const isDone = progress.scannedCheckpoints.includes(cp.id);
              const zone = gameData.zones.find((z: any) => z.id === cp.zona_id);
              const color = zone?.warna_tema || '#3b82f6';
              const x = (cp.posisi_x || 20) * 2;
              const y = cp.posisi_y || 20;
              
              return (
                <g 
                  key={cp.id} 
                  transform={`translate(${x}, ${y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCheckpoint(cp);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {isDone ? (
                    <>
                      <circle cx="0" cy="0" r="3.5" fill={color} stroke="white" strokeWidth="1" />
                      <path d="M-1.2,-0.2 L-0.3,0.8 L1.5,-1" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  ) : cp.bonus ? (
                    <>
                      <polygon points="0,-4 1.2,-1.2 4,-1.2 1.8,0.8 2.5,3.8 0,2 -2.5,3.8 -1.8,0.8 -4,-1.2 -1.2,-1.2" fill="#fff" stroke="#94a3b8" strokeWidth="0.5" />
                      <path d="M-1.5,-1.5 L-1.5,-2.5 A1.5,1.5 0 0,1 1.5,-2.5 L1.5,-1.5 M-2,-1.5 L2,-1.5 L2,1.5 L-2,1.5 Z" fill="none" stroke="#94a3b8" strokeWidth="0.5" transform="scale(0.5) translate(0,1)" />
                    </>
                  ) : (
                    <>
                      <rect x="-3" y="-3" width="6" height="6" rx="1" fill="#fff" stroke="#94a3b8" strokeWidth="0.8" />
                      <path d="M-1,-0.5 L-1,-1.5 A1,1 0 0,1 1,-1.5 L1,-0.5 M-1.5,-0.5 L1.5,-0.5 L1.5,1.5 L-1.5,1.5 Z" fill="none" stroke="#94a3b8" strokeWidth="0.4" />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {activeCheckpoint && (
            <div 
              className="absolute bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 z-10 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200"
              style={{ 
                left: `${(activeCheckpoint.posisi_x || 20) * 2}%`, 
                top: `${activeCheckpoint.posisi_y || 20}%` 
              }}
            >
              {progress.scannedCheckpoints.includes(activeCheckpoint.id) 
                ? (lang === 'id' ? activeCheckpoint.nama_id : activeCheckpoint.nama_en)
                : (lang === 'id' ? 'Lokasi Misteri' : 'Mystery Location')}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full border-4 border-transparent border-t-slate-900"></div>
            </div>
          )}
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
            onChange={e => setManualCode(e.target.value)}
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
    
    // Small timeout to allow DOM element to be ready
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
          // quiet fail on scan error
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
      <div>
        <h2 className="text-2xl font-black text-slate-800">{t('Data Ditemukan!', 'Data Found!')}</h2>
        <p className="text-slate-500 mt-1">{t('Mengekstrak informasi...', 'Extracting information...')}</p>
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
      <div className="w-full text-center">
        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full uppercase tracking-wider mb-3">
          {card.tipe}
        </span>
        <h2 className="text-3xl font-black text-slate-800 leading-tight">
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-800">{t('Koleksi Kartu', 'Card Collection')}</h2>
        <p className="text-slate-500 mt-1">
          {progress.collectedCards.length} / {gameData.cards.length} {t('Terkumpul', 'Collected')}
        </p>
      </div>

      {types.map((type: any) => (
        <div key={type} className="space-y-3">
          <h3 className="font-bold text-slate-800 px-1">{type}</h3>
          <div className="grid grid-cols-3 gap-3">
            {gameData.cards.filter((c: any) => c.tipe === type).map((card: any) => {
              const isCollected = progress.collectedCards.includes(card.id);
              const checkpoint = gameData.checkpoints.find((cp: any) => cp.id === card.checkpoint_id);
              return (
                <div 
                  key={card.id} 
                  className={`aspect-[3/4] rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all ${
                    isCollected 
                      ? 'bg-white shadow-md border-2 border-white' 
                      : 'bg-slate-100 border-2 border-dashed border-slate-300 opacity-60'
                  }`}
                >
                  {isCollected ? (
                    <>
                      {card.ikon_url ? (
                        <img src={card.ikon_url} alt="" className="w-8 h-8 object-contain mb-2" />
                      ) : (
                        <div className="w-8 h-8 bg-blue-100 rounded-full mb-2"></div>
                      )}
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">
                        {lang === 'id' ? checkpoint?.nama_id : checkpoint?.nama_en}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-bold text-xl">?</span>
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

function BlueprintView({ gameData, progress, t, lang }: any) {
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
        className="w-full py-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-lg cursor-not-allowed"
      >
        {t('Selesai & Bagikan', 'Finish & Share')} (Coming Soon)
      </button>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bus, Ship, Settings, Clock, Check, Calendar, Sun, Briefcase, ChevronRight, Star } from 'lucide-react';
import { routes } from './data';
import { 
  getDayType,
  parseTimeToSeconds, 
  getSecondsSinceStartOfDay, 
  findNextDepartures,
  DayType
} from './utils';
import { Route, TransportType, Direction, CountdownState, Language, ScheduleOverride } from './types';

// --- Translation Map ---
const translations = {
  en: {
    nextArrival: 'Next Arrival',
    laterDepartures: 'Later departures',
    onSchedule: 'Estimated',
    bus: 'Bus',
    ferry: 'Ferry',
    settings: 'Settings',
    noMoreService: 'No more service',
    serviceEnded: 'Service has ended for today.',
    scheduledAt: 'Scheduled at',
    language: 'Language',
    close: 'Close',
    min: 'MIN',
    sec: 'SEC',
    hr: 'HR',
    selectLanguage: 'Select Language',
    scheduleType: 'Schedule Type',
    auto: 'Auto',
    weekday: 'Weekday',
    saturday: 'Saturday',
    sunday: 'Holiday/Sunday',
    forceMode: 'Mode: ',
    fullSchedule: 'Full Schedule',
    switchFerryToCentral: 'Ferry (To Central)',
    switchFerryToPI: 'Ferry (To Park Island)',
    switchBusToCentral: 'Bus (To Central)',
    switchBusToPI: 'Bus (To Park Island)',
    switchFerryToTW: 'Ferry (To Tsuen Wan)',
    switchBusToTWWest: 'Bus (To TW West)',
    viaHZMB: 'via HZMB',
    normal: 'Normal',
  },
  zh: {
    nextArrival: '下班車',
    laterDepartures: '稍後班次',
    onSchedule: '預定班次',
    bus: '巴士',
    ferry: '渡輪',
    settings: '設定',
    noMoreService: '今日服務已經結束',
    serviceEnded: '今日班次已全部開出',
    scheduledAt: '開出時間',
    language: '語言',
    close: '關閉',
    min: '分鐘',
    sec: '秒',
    hr: '小時',
    selectLanguage: '選擇語言',
    scheduleType: '班次類型',
    auto: '自動',
    weekday: '平日',
    saturday: '星期六',
    sunday: '紅日/星期日',
    forceMode: '模式: ',
    fullSchedule: '全日班次',
    switchFerryToCentral: '渡輪 (往中環)',
    switchFerryToPI: '渡輪 (往珀麗灣)',
    switchBusToCentral: '巴士 (往中環)',
    switchBusToPI: '巴士 (往珀麗灣)',
    switchFerryToTW: '渡輪 (往荃灣)',
    switchBusToTWWest: '巴士 (往荃灣西)',
    viaHZMB: '經港珠澳',
    normal: '不經港珠澳',
  }
};

// --- Components ---

const CurrentTimeBar: React.FC<{ now: Date; lang: Language; displayType: DayType }> = ({ now, lang, displayType }) => {
  const t = translations[lang];
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-HK' : 'en-GB', options);
  const parts = formatter.formatToParts(now);
  
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;

  const dateStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
  const dayStr = getPart('weekday');
  const timeStr = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

  const typeLabel = t[displayType];

  return (
    <div className="bg-indigo-950 text-white pt-12 pb-6 px-6 flex flex-col items-center justify-center border-b border-indigo-800/30 shadow-2xl">
      <div className="flex items-center space-x-2 text-indigo-300 font-bold tracking-widest text-[10px] uppercase mb-1">
        <span>{dateStr}</span>
        <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
        <span>{dayStr}</span>
        <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
        <span className="text-white bg-indigo-600 px-2 py-0.5 rounded-full">{typeLabel}</span>
      </div>
      <div className="mono text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-md">
        {timeStr}
      </div>
    </div>
  );
};

const Header: React.FC<{
  selectedRoute: Route;
  onSelectRoute: (route: Route) => void;
  filteredRoutes: Route[];
  lang: Language;
  scheduleOverride: ScheduleOverride;
  onToggleOverride: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}> = ({ selectedRoute, onSelectRoute, filteredRoutes, lang, scheduleOverride, onToggleOverride, favorites, onToggleFavorite }) => {
  const t = translations[lang];
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const getIcon = () => {
    switch(scheduleOverride) {
      case 'auto': return <span className="font-black text-sm">A</span>;
      case 'weekday': return <Briefcase size={14} />;
      case 'saturday': return <Sun size={14} className="text-amber-400" />;
      case 'sunday': return <Sun size={14} className="text-rose-400" />;
      default: return <span className="font-black text-sm">A</span>;
    }
  };

  useEffect(() => {
    const activeBtn = scrollRef.current?.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedRoute.id]);

  return (
    <div className="bg-white pb-4 shadow-sm sticky top-0 z-30 border-b border-gray-100">
      <div className="flex items-center py-4 space-x-2">
        <div className="relative flex-1 overflow-hidden px-4">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto custom-scrollbar space-x-3 pb-3 scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredRoutes.map((route) => {
              const isFav = favorites.includes(route.id);
              const isSelected = selectedRoute.id === route.id;
              
              return (
                <button
                  key={route.id}
                  data-active={isSelected}
                  onClick={() => onSelectRoute(route)}
                  className={`pl-5 pr-4 py-3 rounded-2xl text-xs font-black transition-all duration-300 flex-shrink-0 whitespace-nowrap flex items-center gap-3 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 active:scale-95'
                  }`}
                >
                  <span>{route.name[lang]}</span>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(route.id);
                    }}
                    className="p-1 -mr-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <Star 
                      size={14} 
                      className={`transition-colors ${
                        isFav 
                          ? isSelected ? 'fill-yellow-300 text-yellow-300' : 'fill-amber-500 text-amber-500' 
                          : isSelected ? 'text-indigo-300 hover:text-white' : 'text-slate-300 hover:text-slate-400'
                      }`} 
                    />
                  </div>
                </button>
              );
            })}
            <div className="flex-shrink-0 w-8" />
          </div>
        </div>
        
        <button 
          onClick={onToggleOverride}
          className="flex-shrink-0 flex items-center space-x-2 mr-4 px-3 py-3 bg-slate-900 rounded-2xl text-[10px] font-bold text-white active:scale-90 transition-all shadow-lg shadow-slate-200"
        >
          {getIcon()}
          <span className="hidden xs:inline">{t[scheduleOverride]}</span>
        </button>
      </div>
    </div>
  );
};

const SegmentedControl: React.FC<{
  directions: Direction[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  lang: Language;
}> = ({ directions, selectedIndex, onSelect, lang }) => {
  return (
    <div className="mx-4 mt-6 bg-slate-100 p-1.5 rounded-2xl flex relative border border-slate-200/50">
      <div 
        className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-md transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          width: 'calc(50% - 6px)',
          left: selectedIndex === 0 ? '6px' : 'calc(50%)'
        }}
      />
      {directions.map((dir, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`flex-1 py-3 text-xs font-extrabold z-10 transition-colors duration-300 ${
            selectedIndex === idx ? 'text-indigo-700' : 'text-slate-400'
          }`}
        >
          {dir.label[lang]}
        </button>
      ))}
    </div>
  );
};

const HeroCountdown: React.FC<{
  minutes: number;
  seconds: number;
  departureTime: string;
  isAvailable: boolean;
  lang: Language;
  routeId: string;
  directionIndex: number;
}> = ({ minutes, seconds, departureTime, isAvailable, lang, routeId, directionIndex }) => {
  const t = translations[lang];
  const getColorClass = () => {
    if (!isAvailable) return 'text-slate-300';
    if (minutes < 1) return 'text-rose-500 animate-pulse';
    if (minutes < 5) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getBgClass = () => {
     if (!isAvailable) return 'bg-white';
     if (minutes < 1) return 'bg-rose-50/50 border-rose-100';
     return 'bg-white border-gray-100';
  }

  const formattedSeconds = seconds.toString().padStart(2, '0');

  // Badge Logic for NR334 (Airport)
  let statusBadge = null;
  if (routeId === 'NR334' && isAvailable && departureTime !== '--:--') {
    const minute = departureTime.split(':')[1];
    const isToAirport = directionIndex === 0;
    
    // Logic:
    // To Airport: :00 -> HZMB (Orange), :30 -> Normal (Gray)
    // To PI:      :30 -> HZMB (Orange), :00 -> Normal (Gray)
    let isHzmb = false;
    let isNormal = false;

    if (isToAirport) {
        if (minute === '00') isHzmb = true;
        else if (minute === '30') isNormal = true;
    } else {
        if (minute === '30') isHzmb = true;
        else if (minute === '00') isNormal = true;
    }

    if (isHzmb) {
        statusBadge = (
            <div className="mr-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 border border-orange-200">
                {t.viaHZMB}
            </div>
        );
    } else if (isNormal) {
        statusBadge = (
            <div className="mr-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                {t.normal}
            </div>
        );
    }
  }

  return (
    <div className={`mx-4 mt-6 rounded-[32px] p-8 shadow-2xl shadow-indigo-100/50 border transition-colors duration-500 relative overflow-hidden ${getBgClass()}`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Clock size={160} strokeWidth={1} />
      </div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.nextArrival}</span>
          <div className="flex items-center">
             {statusBadge}
             <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full font-black text-xs border border-indigo-100/50">
                {departureTime}
             </div>
          </div>
        </div>

        <div className={`mono text-8xl font-black flex items-baseline leading-none tracking-tighter ${getColorClass()}`}>
          {isAvailable ? (
            minutes >= 60 ? (
              <>
                {Math.floor(minutes / 60)}
                <span className="text-4xl mx-1 opacity-50">:</span>
                <span className="text-5xl opacity-80">{(minutes % 60).toString().padStart(2, '0')}</span>
                <span className="text-lg font-black ml-3 text-slate-300 tracking-normal">{t.hr}</span>
              </>
            ) : minutes >= 1 ? (
              <>
                {minutes}
                <span className="text-4xl mx-1 opacity-50">:</span>
                <span className="text-5xl opacity-80">{formattedSeconds}</span>
                <span className="text-lg font-black ml-3 text-slate-300 tracking-normal">{t.min}</span>
              </>
            ) : (
              <>
                {seconds}
                <span className="text-lg font-black ml-3 text-slate-300 tracking-normal">{t.sec}</span>
              </>
            )
          ) : (
            <span className="text-2xl uppercase leading-tight tracking-tight">{t.noMoreService}</span>
          )}
        </div>
        
        <p className="mt-6 text-sm text-slate-500 font-bold flex items-center">
          <Clock size={14} className="mr-2 opacity-30" />
          {isAvailable ? `${t.scheduledAt} ${departureTime}` : t.serviceEnded}
        </p>
      </div>
    </div>
  );
};

interface CrossRouteButtonProps {
  label: string;
  onAction: () => void;
  Icon: React.ElementType;
}

const UpcomingSchedule: React.FC<{ 
  times: string[]; 
  lang: Language; 
  isFullList: boolean;
  crossRoute?: CrossRouteButtonProps | null;
  routeId: string;
  directionIndex: number;
}> = ({ times, lang, isFullList, crossRoute, routeId, directionIndex }) => {
  const t = translations[lang];
  if (times.length === 0) return null;
  
  return (
    <div className="mx-4 mt-10 mb-32">
      <div className="flex items-center justify-between mb-5 px-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          {isFullList ? t.fullSchedule : t.laterDepartures}
        </h3>
        {crossRoute && (
          <button 
            onClick={crossRoute.onAction}
            className="flex items-center space-x-2 bg-slate-200/60 hover:bg-slate-200 active:bg-slate-300 px-3 py-1.5 rounded-xl transition-all"
          >
            <crossRoute.Icon size={14} className="text-slate-600" />
            <span className="text-[10px] font-bold text-slate-600">{crossRoute.label}</span>
            <ChevronRight size={12} className="text-slate-400" />
          </button>
        )}
      </div>
      <div className="bg-white rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
        {times.map((time, idx) => {
          let label = t.onSchedule;
          let labelClass = "text-slate-500 bg-slate-100";

          if (routeId === 'NR334') {
             const minute = time.split(':')[1];
             const isToAirport = directionIndex === 0;
             // To Airport: 00 -> HZMB, 30 -> Normal
             // To PI: 30 -> HZMB, 00 -> Normal
             
             if (isToAirport) {
                if (minute === '00') {
                    label = t.viaHZMB;
                    labelClass = "text-orange-600 bg-orange-100";
                } else if (minute === '30') {
                    label = t.normal;
                    labelClass = "text-slate-500 bg-slate-100";
                }
             } else {
                if (minute === '30') {
                    label = t.viaHZMB;
                    labelClass = "text-orange-600 bg-orange-100";
                } else if (minute === '00') {
                    label = t.normal;
                    labelClass = "text-slate-500 bg-slate-100";
                }
             }
          }

          return (
            <div 
              key={idx} 
              className={`flex items-center justify-between p-6 active:bg-slate-50 transition-colors ${
                idx !== times.length - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center mr-5 text-indigo-600 shadow-sm">
                  <Clock size={20} strokeWidth={2.5} />
                </div>
                <span className="mono text-2xl font-black text-slate-800 tracking-tighter tabular-nums">{time}</span>
              </div>
              <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${labelClass}`}>{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  scheduleOverride: ScheduleOverride;
  onScheduleOverrideChange: (mode: ScheduleOverride) => void;
}> = ({ isOpen, onClose, lang, onLangChange, scheduleOverride, onScheduleOverrideChange }) => {
  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom duration-500 ease-out">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 sm:hidden"></div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.settings}</h2>
          <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
            <Check size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="space-y-10">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-5">
              {t.selectLanguage}
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(['en', 'zh'] as Language[]).map((l) => (
                <button 
                  key={l}
                  onClick={() => onLangChange(l)}
                  className={`p-5 rounded-3xl border-2 transition-all text-left ${
                    lang === l 
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-lg shadow-indigo-100' 
                      : 'border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="font-black text-lg leading-none mb-2">{l === 'en' ? 'English' : '繁體中文'}</div>
                  <div className="text-[10px] uppercase font-bold opacity-60">{l === 'en' ? 'Default' : 'Traditional'}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-5">
              {t.scheduleType}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['auto', 'weekday', 'saturday', 'sunday'] as ScheduleOverride[]).map((mode) => (
                <button 
                  key={mode}
                  onClick={() => onScheduleOverrideChange(mode)}
                  className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all ${
                    scheduleOverride === mode 
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-lg shadow-indigo-100' 
                      : 'border-slate-100 text-slate-400'
                  }`}
                >
                  <span className="font-black text-sm">{t[mode]}</span>
                  {scheduleOverride === mode && <Check size={16} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-12 pb-6 sm:pb-0">
          <button 
            onClick={onClose}
            className="w-full py-5 bg-indigo-600 text-white font-black text-lg rounded-3xl shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

const Footer: React.FC<{
  currentType: TransportType;
  onTypeChange: (type: TransportType) => void;
  lang: Language;
  onOpenSettings: () => void;
}> = ({ currentType, onTypeChange, lang, onOpenSettings }) => {
  const t = translations[lang];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center pt-5 pb-10 px-6 z-40">
      <button 
        onClick={() => onTypeChange(TransportType.BUS)}
        className={`flex flex-col items-center space-y-2 transition-all ${
          currentType === TransportType.BUS ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'
        }`}
      >
        <Bus size={28} fill={currentType === TransportType.BUS ? "currentColor" : "none"} strokeWidth={2.5} />
        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t.bus}</span>
      </button>
      
      <button 
        onClick={() => onTypeChange(TransportType.FERRY)}
        className={`flex flex-col items-center space-y-2 transition-all ${
          currentType === TransportType.FERRY ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'
        }`}
      >
        <Ship size={28} fill={currentType === TransportType.FERRY ? "currentColor" : "none"} strokeWidth={2.5} />
        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t.ferry}</span>
      </button>
      
      <button 
        onClick={onOpenSettings}
        className="flex flex-col items-center space-y-2 text-slate-300 hover:text-slate-400 transition-all"
      >
        <Settings size={28} strokeWidth={2.5} />
        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t.settings}</span>
      </button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeType, setActiveType] = useState<TransportType>(TransportType.BUS);
  const [lang, setLang] = useState<Language>('zh');
  const [scheduleOverride, setScheduleOverride] = useState<ScheduleOverride>('auto');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route>(routes.find(r => r.type === TransportType.BUS) || routes[0]);
  const [directionIndex, setDirectionIndex] = useState(0);
  const [now, setNow] = useState(new Date());

  // Load favorites from local storage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem('favorites');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
        prev.includes(id) 
            ? prev.filter(f => f !== id)
            : [...prev, id]
    );
  };

  // Sort favorites to the top
  const filteredRoutes = useMemo(() => {
    const typeRoutes = routes.filter(r => r.type === activeType);
    return typeRoutes.sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav === bFav) return 0; // Keep original relative order
        return aFav ? -1 : 1;
    });
  }, [activeType, favorites]);

  // Handle manual type change (e.g. via Footer)
  const handleTypeChange = (newType: TransportType) => {
    if (newType === activeType) return;
    
    setActiveType(newType);
    
    // Auto-select best route (favorites first) when switching tabs
    const typeRoutes = routes.filter(r => r.type === newType);
    const sorted = [...typeRoutes].sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav === bFav) return 0;
        return aFav ? -1 : 1;
    });

    if (sorted.length > 0) {
      setSelectedRoute(sorted[0]);
      setDirectionIndex(0);
    }
  };

  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route);
    setDirectionIndex(0);
  };

  const handleSwitchRoute = (routeId: string, dirIndex: number = 0) => {
    const target = routes.find(r => r.id === routeId);
    if (target) {
        setActiveType(target.type);
        setSelectedRoute(target);
        setDirectionIndex(dirIndex);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleOverride = () => {
    const modes: ScheduleOverride[] = ['auto', 'weekday', 'saturday', 'sunday'];
    const nextIdx = (modes.indexOf(scheduleOverride) + 1) % modes.length;
    setScheduleOverride(modes[nextIdx]);
  };

  const detectedDayType = useMemo(() => getDayType(now), [now]);
  const effectiveDayType = scheduleOverride === 'auto' ? detectedDayType : (scheduleOverride as DayType);

  const { currentCountdown, nextDepartures, showFullSchedule } = useMemo(() => {
    const direction = selectedRoute.directions[directionIndex];
    
    // Logic: NR330 (Tsing Yi), NR332 (Kwai Fong), NR338 (Central) operate 24h or effectively so.
    // They should always show upcoming departures, handling day transitions seamlessly.
    const isContinuousService = ['NR330', 'NR332', 'NR338'].includes(selectedRoute.id);
    
    // Adjust day logic for 24h service
    // If it's early morning (e.g. 05:00), we want to treat it as "yesterday" service day
    // This allows seamless transition for 24h routes.
    let currentServiceDayType = effectiveDayType;
    let shouldUseAdjustedDate = false;
    
    if (isContinuousService && scheduleOverride === 'auto') {
        const adjustedDate = new Date(now);
        if (adjustedDate.getHours() < 6) {
            adjustedDate.setDate(adjustedDate.getDate() - 1);
        }
        currentServiceDayType = getDayType(adjustedDate);
        shouldUseAdjustedDate = true;
    }

    const departures = direction.departures[currentServiceDayType] || [];
    
    const currentTimeSeconds = getSecondsSinceStartOfDay(now);
    const nextTime = departures.find(t => parseTimeToSeconds(t) > currentTimeSeconds);
    
    let countdown: CountdownState = {
      minutes: 0,
      seconds: 0,
      departureTime: '--:--',
      isAvailable: false
    };

    let upcoming: string[] = [];
    let isFullList = false;

    if (nextTime) {
      const nextSeconds = parseTimeToSeconds(nextTime);
      const diff = nextSeconds - currentTimeSeconds;
      countdown = {
        minutes: Math.floor(diff / 60),
        seconds: diff % 60,
        departureTime: nextTime,
        isAvailable: true
      };

      const isServiceGapLarge = (nextSeconds - currentTimeSeconds) > 3600;
      // Show full schedule if Ferry OR (Bus AND GapLarge AND Not Continuous)
      // Continuous routes specifically request to show 'later departures' (not full) even if gap is large,
      // UNLESS service has ended (handled in else block).
      const shouldShowFull = selectedRoute.type === TransportType.FERRY || 
                             (selectedRoute.type === TransportType.BUS && isServiceGapLarge && !isContinuousService);

      if (shouldShowFull) {
          upcoming = departures;
          isFullList = true;
      } else {
          const needed = 6;
          let nextList = findNextDepartures(departures, currentTimeSeconds, needed);
          
          // Continuous Service Logic: Fetch from next day if needed to ensure 5 departures are shown
          if (isContinuousService && nextList.length < needed) {
              let nextDayDepartures = [];
              if (scheduleOverride === 'auto') {
                  const baseDate = shouldUseAdjustedDate ? (() => {
                      const d = new Date(now);
                      if (d.getHours() < 6) d.setDate(d.getDate() - 1);
                      return d;
                  })() : new Date(now);
                  
                  const nextServiceDate = new Date(baseDate);
                  nextServiceDate.setDate(nextServiceDate.getDate() + 1);
                  const nextDayType = getDayType(nextServiceDate);
                  nextDayDepartures = direction.departures[nextDayType] || [];
              } else {
                  nextDayDepartures = departures;
              }
              const countToFetch = needed - nextList.length;
              nextList = [...nextList, ...nextDayDepartures.slice(0, countToFetch)];
          }

          upcoming = nextList.slice(1);
          isFullList = false;
      }
    } else {
      // Service ended for today -> Find next day's first departure
      let nextDayDepartures = departures;
      
      if (scheduleOverride === 'auto') {
         // Determine "Next Day" based on the current effective service day
         const baseDate = shouldUseAdjustedDate ? (() => {
              const d = new Date(now);
              if (d.getHours() < 6) d.setDate(d.getDate() - 1);
              return d;
         })() : new Date(now);

         const nextServiceDate = new Date(baseDate);
         nextServiceDate.setDate(nextServiceDate.getDate() + 1);
         const nextDayType = getDayType(nextServiceDate);
         nextDayDepartures = direction.departures[nextDayType] || [];
      } else {
         // Loop back to start of current schedule type
         nextDayDepartures = departures;
      }

      if (nextDayDepartures.length > 0) {
        const firstNextDay = nextDayDepartures[0];
        const firstNextSeconds = parseTimeToSeconds(firstNextDay);
        // Calculate diff: (24h + time in next day) - current service time
        // This formula works even if currentTimeSeconds > 24h (e.g. 29h).
        // e.g. 29h now, next bus 6h. Diff = (24+6) - 29 = 1h.
        const diff = (24 * 3600 + firstNextSeconds) - currentTimeSeconds;
        
        countdown = {
            minutes: Math.floor(diff / 60),
            seconds: diff % 60,
            departureTime: firstNextDay,
            isAvailable: true
        };
        
        // Show next 5 departures for Continuous Routes instead of full list for next day
        if (isContinuousService) {
             upcoming = nextDayDepartures.slice(1, 6);
             isFullList = false;
        } else {
             upcoming = nextDayDepartures;
             isFullList = true;
        }
      }
    }

    return { 
      currentCountdown: countdown, 
      nextDepartures: upcoming,
      showFullSchedule: isFullList
    };
  }, [now, selectedRoute, directionIndex, effectiveDayType, scheduleOverride]);

  const crossRouteData = useMemo(() => {
      const t = translations[lang];
      // Central Logic
      if (selectedRoute.id === 'NR338') {
          const isToCentral = directionIndex === 0;
          return {
              label: isToCentral ? t.switchFerryToCentral : t.switchFerryToPI,
              onAction: () => handleSwitchRoute('Ferry-Central', directionIndex),
              Icon: Ship
          };
      }
      if (selectedRoute.id === 'Ferry-Central') {
          const isToCentral = directionIndex === 0;
          return {
              label: isToCentral ? t.switchBusToCentral : t.switchBusToPI,
              onAction: () => handleSwitchRoute('NR338', directionIndex),
              Icon: Bus
          };
      }
      
      // Tsuen Wan Logic
      if (selectedRoute.id === 'NR331S') {
          const isToDest = directionIndex === 0; // To TW West
          return {
              label: isToDest ? t.switchFerryToTW : t.switchFerryToPI,
              onAction: () => handleSwitchRoute('Ferry-Tsuen-Wan', directionIndex),
              Icon: Ship
          };
      }
      if (selectedRoute.id === 'Ferry-Tsuen-Wan') {
          const isToDest = directionIndex === 0; // To TW Pier
          return {
              label: isToDest ? t.switchBusToTWWest : t.switchBusToPI,
              onAction: () => handleSwitchRoute('NR331S', directionIndex),
              Icon: Bus
          };
      }
      
      return null;
  }, [selectedRoute.id, directionIndex, lang]);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20 select-none bg-slate-50">
      <CurrentTimeBar now={now} lang={lang} displayType={effectiveDayType} />
      
      <Header 
        selectedRoute={selectedRoute} 
        onSelectRoute={handleSelectRoute} 
        filteredRoutes={filteredRoutes}
        lang={lang}
        scheduleOverride={scheduleOverride}
        onToggleOverride={handleToggleOverride}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />
      
      <main className="animate-in fade-in slide-in-from-bottom-2 duration-700">
        <SegmentedControl 
          directions={selectedRoute.directions} 
          selectedIndex={directionIndex}
          onSelect={setDirectionIndex}
          lang={lang}
        />

        <HeroCountdown 
          {...currentCountdown}
          lang={lang}
          routeId={selectedRoute.id}
          directionIndex={directionIndex}
        />

        <UpcomingSchedule 
          times={nextDepartures} 
          lang={lang}
          isFullList={showFullSchedule}
          crossRoute={crossRouteData}
          routeId={selectedRoute.id}
          directionIndex={directionIndex}
        />
      </main>

      <Footer 
        currentType={activeType} 
        onTypeChange={handleTypeChange}
        lang={lang}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lang={lang}
        onLangChange={setLang}
        scheduleOverride={scheduleOverride}
        onScheduleOverrideChange={setScheduleOverride}
      />
    </div>
  );
}

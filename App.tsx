import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bus, Ship, Settings, Clock, Check, Calendar, Sun, Briefcase, ChevronRight, Star, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
    nextArrival: 'Time Remaining',
    laterDepartures: 'Later departures',
    onSchedule: 'Estimated',
    bus: 'Bus',
    ferry: 'Ferry',
    settings: 'Settings',
    noMoreService: 'No more service',
    serviceEnded: 'Service has ended for today.',
    scheduledAt: 'Departure time',
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
    lastDeparture: 'Last Departure',
    show48h: 'Show 48h',
    show12h: "Show today's remaining departures",
    show24h: 'Show 24h',
    showFullDay: 'Show Full Day',
    kwaiFongOvernight: 'Kwai Fong Overnight Departures',
    viaKwaiFong: 'Via Kwai Fong',
    viaTsingYi: 'Via Tsing Yi',
    overnightWanChai: 'Overnight Departures (via Wan Chai)',
    overnightGeneric: 'Overnight Departures',
  },
  zh: {
    nextArrival: '開出時間剩餘',
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
    lastDeparture: '尾班',
    show48h: '顯示48小時',
    show12h: '顯示今日餘下班次',
    show24h: '顯示24小時',
    showFullDay: '顯示全日班次',
    kwaiFongOvernight: '葵芳通宵班次',
    viaKwaiFong: '經葵芳',
    viaTsingYi: '經青衣',
    overnightWanChai: '通宵班次（經灣仔）',
    overnightGeneric: '通宵班次',
  }
};

interface Badge {
  text: string;
  className: string;
}

interface ScheduleItem {
  time: string;
  timestamp: number;
  badges: Badge[];
  dateLabel?: string;
}

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
  badges: Badge[];
}> = ({ minutes, seconds, departureTime, isAvailable, lang, badges }) => {
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

  return (
    <div className={`mx-4 mt-6 rounded-[32px] p-8 shadow-2xl shadow-indigo-100/50 border transition-colors duration-500 relative overflow-hidden ${getBgClass()}`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Clock size={160} strokeWidth={1} />
      </div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.nextArrival}</span>
          <div className="flex items-center gap-2">
             {badges.map((badge, idx) => (
               <div key={idx} className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${badge.className}`}>
                 {badge.text}
               </div>
             ))}
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
  items: ScheduleItem[]; 
  lang: Language; 
  isFullList: boolean;
  crossRoute?: CrossRouteButtonProps | null;
  routeId: string;
  directionIndex: number;
  canExtend: boolean;
  isExtendedView: boolean;
  onToggleView: () => void;
  collapseLabel: string;
  expandLabel: string;
}> = ({ items, lang, isFullList, crossRoute, routeId, directionIndex, canExtend, isExtendedView, onToggleView, collapseLabel, expandLabel }) => {
  const t = translations[lang];
  if (items.length === 0) return null;
  
  return (
    <div className="mx-4 mt-10 mb-32">
      <div className="flex items-center justify-between mb-5 px-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {isFullList ? t.fullSchedule : t.laterDepartures}
          </h3>
          {canExtend && (
            <button 
              onClick={onToggleView}
              className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-200 transition-colors flex items-center gap-1"
            >
              {isExtendedView ? (
                 <>
                   <ArrowUpCircle size={10} /> {collapseLabel}
                 </>
              ) : (
                 <>
                   <ArrowDownCircle size={10} /> {expandLabel}
                 </>
              )}
            </button>
          )}
        </div>
        
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
        {items.map((item, idx) => {
          const showDateHeader = idx === 0 || item.dateLabel !== items[idx - 1].dateLabel;

          return (
            <React.Fragment key={`${item.timestamp}-${idx}`}>
              {isExtendedView && showDateHeader && item.dateLabel && (
                <div className="px-6 py-2 bg-slate-50 border-y border-slate-100 text-xs font-bold text-slate-500 sticky top-0">
                  {item.dateLabel}
                </div>
              )}
              <div 
                className={`flex items-center justify-between p-6 active:bg-slate-50 transition-colors ${
                  idx !== items.length - 1 ? 'border-b border-slate-50' : ''
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mr-5 shadow-sm bg-slate-50 text-indigo-600`}>
                    <Clock size={20} strokeWidth={2.5} />
                  </div>
                  <span className={`mono text-2xl font-black tracking-tighter tabular-nums text-slate-800`}>{item.time}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {item.badges.map((badge, bIdx) => (
                        <span key={bIdx} className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${badge.className}`}>
                            {badge.text}
                        </span>
                    ))}
                </div>
              </div>
            </React.Fragment>
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
  
  // New state for extended view toggle
  const [isExtendedView, setIsExtendedView] = useState(false);

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
      setIsExtendedView(false); // Reset view mode
    }
  };

  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route);
    setDirectionIndex(0);
    setIsExtendedView(false); // Reset view mode on route change
  };

  const handleSwitchRoute = (routeId: string, dirIndex: number = 0) => {
    const target = routes.find(r => r.id === routeId);
    if (target) {
        setActiveType(target.type);
        setSelectedRoute(target);
        setDirectionIndex(dirIndex);
        setIsExtendedView(false);
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

  // Group definitions for view behavior
  // Group A: Limit 10 (Today) vs Full Day (Today)
  const GROUP_A = ['NR331', 'NR331S', 'NR334', 'Ferry-Central']; 
  // Group B: 24h vs 48h
  const GROUP_B = ['NR330', 'NR332', 'NR338'];
  
  const EXTENDED_VIEW_ROUTES = [...GROUP_A, ...GROUP_B];
  const canExtend = EXTENDED_VIEW_ROUTES.includes(selectedRoute.id);

  const { currentCountdown, nextDepartures, showFullSchedule, collapseLabel, expandLabel } = useMemo(() => {
    const t = translations[lang];
    const direction = selectedRoute.directions[directionIndex];
    
    // Global Service Day Adjustment for 00:00-06:00
    // Treat 00:00-05:59 as part of the previous day for scheduling
    let currentServiceDayType = effectiveDayType;
    let shouldUseAdjustedDate = false;
    
    if (scheduleOverride === 'auto') {
        const adjustedDate = new Date(now);
        if (adjustedDate.getHours() < 6) {
            adjustedDate.setDate(adjustedDate.getDate() - 1);
        }
        currentServiceDayType = getDayType(adjustedDate);
        shouldUseAdjustedDate = adjustedDate.getDate() !== now.getDate();
    }

    const departures = direction.departures[currentServiceDayType] || [];
    const currentTimeSeconds = getSecondsSinceStartOfDay(now);
    const nextTime = departures.find(tStr => parseTimeToSeconds(tStr) > currentTimeSeconds);
    
    // Helper to get day type for an offset day (0 = today/current service day, 1 = next day, etc)
    const getServiceDayDepartures = (dayOffset: number) => {
         if (scheduleOverride === 'auto') {
             const baseDate = shouldUseAdjustedDate ? (() => {
                 const d = new Date(now);
                 if (d.getHours() < 6) d.setDate(d.getDate() - 1);
                 return d;
             })() : new Date(now);
             
             const targetDate = new Date(baseDate);
             targetDate.setDate(targetDate.getDate() + dayOffset);
             const type = getDayType(targetDate);
             
             // Date Label Formatting
             const formatter = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-HK' : 'en-GB', {
                 weekday: 'short', month: 'numeric', day: 'numeric'
             });
             const dateLabel = formatter.format(targetDate);

             return { times: direction.departures[type] || [], dateLabel };
        }
        // Manual override: just repeat the same schedule
        return { times: departures, dateLabel: `Day +${dayOffset}` }; 
    };

    // Countdown Calculation
    let countdown: CountdownState = { minutes: 0, seconds: 0, departureTime: '--:--', isAvailable: false };
    let countdownTimestamp = -1;
    
    if (nextTime) {
        const nextSeconds = parseTimeToSeconds(nextTime);
        const diff = nextSeconds - currentTimeSeconds;
        countdown = {
            minutes: Math.floor(diff / 60),
            seconds: diff % 60,
            departureTime: nextTime,
            isAvailable: true
        };
        countdownTimestamp = nextSeconds;
    } else {
        const nextDayData = getServiceDayDepartures(1);
        const nextDayDeps = nextDayData.times;
        if (nextDayDeps.length > 0) {
            const firstNextDay = nextDayDeps[0];
            const firstNextSeconds = parseTimeToSeconds(firstNextDay);
            // Time until next day's first departure (24h offset + time)
            const diff = (24 * 3600 + firstNextSeconds) - currentTimeSeconds;
            countdown = {
                minutes: Math.floor(diff / 60),
                seconds: diff % 60,
                departureTime: firstNextDay,
                isAvailable: true
            };
            countdownTimestamp = 24 * 3600 + firstNextSeconds;
        }
    }

    // Determine the threshold for showing upcoming departures
    // Ensure we filter out the departure currently being counted down
    const filterThreshold = countdown.isAvailable ? countdownTimestamp : currentTimeSeconds;

    // Helper to create badges
    const getBadges = (timeStr: string, isLastItem: boolean) => {
        const badges: Badge[] = [];
        let specialBadge: Badge | null = null;
        let isLast = isLastItem;
        
        // NR330 (Tsing Yi) Logic
        if (selectedRoute.id === 'NR330') {
           const isToTsingYi = directionIndex === 0;
           const isToPI = directionIndex === 1;
           const overnightDeparturesToTY = ['01:00', '01:45', '02:30', '03:15', '04:00', '04:45', '05:30'];
           const overnightDeparturesToPI = ['01:15', '02:00', '02:45', '03:30', '04:15', '05:00', '05:45'];

           if (isToTsingYi && overnightDeparturesToTY.includes(timeStr)) {
               specialBadge = { text: t.kwaiFongOvernight, className: "text-purple-600 bg-purple-100 border border-purple-200" };
           } else if (isToPI && overnightDeparturesToPI.includes(timeStr)) {
               specialBadge = { text: t.viaKwaiFong, className: "text-purple-600 bg-purple-100 border border-purple-200" };
           }
        }

        // NR332 (Kwai Fong) Logic
        if (selectedRoute.id === 'NR332') {
            const isToKwaiFong = directionIndex === 0;
            const overnightDeparturesToKF = ['01:00', '01:45', '02:30', '03:15', '04:00', '04:45', '05:30'];
            
            if (isToKwaiFong && overnightDeparturesToKF.includes(timeStr)) {
                specialBadge = { text: t.viaTsingYi, className: "text-purple-600 bg-purple-100 border border-purple-200" };
            }
        }

        // NR338 (Central) Logic
        if (selectedRoute.id === 'NR338') {
            const isToCentral = directionIndex === 0;
            const isToPI = directionIndex === 1;

            // Override Last Departure Logic
            if (isToCentral) isLast = (timeStr === '06:00');
            else if (isToPI) isLast = (timeStr === '06:35');

            // Overnight Badges
            const overnightToCentral = ['23:50', '01:05', '02:20', '03:30', '04:45', '06:00'];
            const overnightToPI = ['00:30', '01:40', '02:55', '04:05', '05:20', '06:35'];

            if (isToCentral && overnightToCentral.includes(timeStr)) {
                specialBadge = { text: t.overnightWanChai, className: "text-purple-600 bg-purple-100 border border-purple-200" };
            } else if (isToPI && overnightToPI.includes(timeStr)) {
                specialBadge = { text: t.overnightWanChai, className: "text-purple-600 bg-purple-100 border border-purple-200" };
            }
        }

        let showLast = isLast;
        // NR334 HZMB Logic (Specific handling to preserve existing behavior)
        if (selectedRoute.id === 'NR334') {
             const minute = timeStr.split(':')[1];
             const isToAirport = directionIndex === 0;
             const isToPI = directionIndex === 1;
             
             // Check for 00:00 (To Airport) or 00:30 (To PI) special "Last" logic
             const isSpecialLastHzmb = (isToAirport && timeStr === '00:00') || (isToPI && timeStr === '00:30');
             const isHzmbTime = (isToAirport && minute === '00') || (isToPI && minute === '30');
             
             // Reset showLast to strictly follow isLastItem for NR334 as per original logic structure
             showLast = isLastItem; 

             if (showLast) {
                 badges.push({ text: t.lastDeparture, className: "text-red-600 bg-red-100 border border-red-200" });
                 // If it is the special last HZMB bus, show HZMB badge too
                 if (isSpecialLastHzmb) {
                     badges.push({ text: t.viaHZMB, className: "text-orange-600 bg-orange-100" });
                 }
             } else {
                 if (isHzmbTime) {
                     badges.push({ text: t.viaHZMB, className: "text-orange-600 bg-orange-100" });
                 } else if ((isToAirport && minute === '30') || (isToPI && minute === '00')) {
                     badges.push({ text: t.normal, className: "text-slate-500 bg-slate-100" });
                 } else {
                     badges.push({ text: t.onSchedule, className: "text-slate-500 bg-slate-100" });
                 }
             }
        } else {
            // General Logic for other routes
            if (showLast) {
                badges.push({ text: t.lastDeparture, className: "text-red-600 bg-red-100 border border-red-200" });
            }
            
            if (specialBadge) {
                badges.push(specialBadge);
            } else if (!showLast) {
                badges.push({ text: t.onSchedule, className: "text-slate-500 bg-slate-100" });
            }
        }
        return badges;
    };

    // List Logic
    let upcoming: ScheduleItem[] = [];
    let isFullList = false;

    if (selectedRoute.id === 'Ferry-Tsuen-Wan') {
        // Always Full Schedule for TW Ferry
        upcoming = departures.map((tStr, idx) => ({ 
            time: tStr, 
            timestamp: parseTimeToSeconds(tStr), 
            badges: getBadges(tStr, idx === departures.length - 1)
        }));
        isFullList = true;
    } else if (canExtend) {
        // Generate schedule for Today (Day 0), Tomorrow (Day 1), Day After (Day 2) to cover 48h
        let allCandidates: ScheduleItem[] = [];
        
        for (let i = 0; i <= 2; i++) {
            const { times, dateLabel } = getServiceDayDepartures(i);
            const daySecondsOffset = i * 24 * 3600;
            const dayItems = times.map((tStr, idx) => {
                return {
                    time: tStr,
                    timestamp: parseTimeToSeconds(tStr) + daySecondsOffset,
                    badges: getBadges(tStr, idx === times.length - 1),
                    dateLabel
                };
            });
            allCandidates = [...allCandidates, ...dayItems];
        }

        if (GROUP_A.includes(selectedRoute.id)) {
             // Group A: Compact = Today's Remaining (No limit). Extended = 48h.
             
             if (isExtendedView) {
                 // Extended: Show 48h
                 const windowEnd = currentTimeSeconds + (48 * 3600);
                 upcoming = allCandidates.filter(item => item.timestamp > filterThreshold && item.timestamp <= windowEnd);
             } else {
                 // Compact: Today's remaining items (full set)
                 const day0Data = getServiceDayDepartures(0);
                 const day0Items = day0Data.times.map((tStr, idx) => ({
                      time: tStr,
                      timestamp: parseTimeToSeconds(tStr),
                      badges: getBadges(tStr, idx === day0Data.times.length - 1),
                      dateLabel: day0Data.dateLabel
                 })).filter(item => item.timestamp > filterThreshold);

                 if (day0Items.length > 0) {
                     upcoming = day0Items;
                 } else {
                     // If today is finished, show full tomorrow
                     const day1Data = getServiceDayDepartures(1);
                     upcoming = day1Data.times.map((tStr, idx) => ({
                          time: tStr,
                          timestamp: parseTimeToSeconds(tStr) + 86400,
                          badges: getBadges(tStr, idx === day1Data.times.length - 1),
                          dateLabel: day1Data.dateLabel
                     })).filter(item => item.timestamp > filterThreshold);
                 }
             }
        } else if (GROUP_B.includes(selectedRoute.id)) {
             // Group B: Compact = 24h. Extended = 48h.
             const hours = isExtendedView ? 48 : 24;
             const windowEnd = currentTimeSeconds + (hours * 3600);
             upcoming = allCandidates.filter(item => item.timestamp > filterThreshold && item.timestamp <= windowEnd);
        }
        
        isFullList = false;
    } else {
        upcoming = [];
    }
    
    // Add badges to countdown if available
    let countdownBadges: Badge[] = [];
    if (countdown.isAvailable && countdown.departureTime !== '--:--') {
        let isLastForCountdown = false;
        if (nextTime) {
             isLastForCountdown = (nextTime === departures[departures.length - 1]);
        } else {
             const nextDayData = getServiceDayDepartures(1);
             const nextDayDeps = nextDayData.times;
             if (nextDayDeps.length > 0 && countdown.departureTime === nextDayDeps[0]) {
                 // First of next day is definitely not last (unless it is the ONLY one)
                 isLastForCountdown = (nextDayDeps.length === 1);
             }
        }
        countdownBadges = getBadges(countdown.departureTime, isLastForCountdown);
    }

    let collapseLabel = t.show12h; // "Show today's..."
    let expandLabel = t.show48h; // "Show 48h"

    if (GROUP_B.includes(selectedRoute.id)) {
        collapseLabel = t.show24h;
        // expandLabel is already show48h
    }

    return { 
      currentCountdown: { ...countdown, badges: countdownBadges }, 
      nextDepartures: upcoming,
      showFullSchedule: isFullList,
      collapseLabel,
      expandLabel
    };
  }, [now, selectedRoute, directionIndex, effectiveDayType, scheduleOverride, isExtendedView, canExtend, lang]);

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
          badges={currentCountdown.badges || []}
          lang={lang}
        />

        <UpcomingSchedule 
          items={nextDepartures} 
          lang={lang}
          isFullList={showFullSchedule}
          crossRoute={crossRouteData}
          routeId={selectedRoute.id}
          directionIndex={directionIndex}
          canExtend={canExtend}
          isExtendedView={isExtendedView}
          onToggleView={() => setIsExtendedView(!isExtendedView)}
          collapseLabel={collapseLabel}
          expandLabel={expandLabel}
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

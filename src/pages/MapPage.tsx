import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Papa from 'papaparse';
import { Loader2, Navigation, Coffee, MapPin, ChevronRight, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQakb_z6zgEh4TzMwNShKSn3vTGa4wY9c-XwN6Mp_fZ2aQYnflQQJ5AD1mhoJhUi0P6wxtHxT6HeOV/pub?output=csv';
const CACHE_KEY = 'v1_geocode_cache_istanbul_cafes';

interface Cafe {
  name: string;
  type: string;
  district: string;
  year: string;
  address: string;
  phone: string;
  hours: string;
  campaign: string;
  lat: number;
  lng: number;
  isGeocoding?: boolean;
}

const GeocodeManualMap: Record<string, {lat: number, lng: number}> = {
  "İBB Penguen Kitabevi": { lat: 40.9880, lng: 29.0250 },
  "Nevmekan Sahil": { lat: 41.0252, lng: 29.0145 },
  "Beltur Paşalimanı": { lat: 41.0315, lng: 29.0102 },
  "Kemp Kafe": { lat: 40.9840, lng: 29.0270 },
  "Idea Kadıköy": { lat: 40.9805, lng: 29.0223 },
  "Espressolab": { lat: 40.9635, lng: 29.0792 },
  "Fahriye Kafe": { lat: 40.9830, lng: 29.0285 },
  "Kahve Dünyası": { lat: 40.9900, lng: 29.0250 },
  "Zemin İstanbul": { lat: 40.9940, lng: 29.0400 },
  "Minoa Akasya": { lat: 41.0005, lng: 29.0545 }
};

export default function MapPage() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{current: number, total: number} | null>(null);
  
  const processingQueue = useRef(false);
  const startPosition: [number, number] = [40.988, 29.025]; 

  const filterType = searchParams.get('filter');
  const isAnyFilterActive = !!filterType;

  const displayedCafes = cafes.filter(cafe => {
    if (!filterType) return true;
    
    const cafeName = cafe.name.toLowerCase();
    
    if (filterType === 'campaign') {
      const targetCafes = ['kemp', 'espressolab', 'kahve dünyası', 'idea'];
      return targetCafes.some(target => cafeName.includes(target));
    }
    if (filterType === 'wifi') {
      const targetCafes = ['penguen', 'zemin', 'idea', 'nevmekan'];
      return targetCafes.some(target => cafeName.includes(target));
    }
    if (filterType === 'plug') {
      const targetCafes = ['espressolab', 'kahve dünyası', 'zemin', 'idea', 'minoa'];
      return targetCafes.some(target => cafeName.includes(target));
    }
    if (filterType === 'student') {
      const targetCafes = ['beltur', 'kemp', 'nevmekan', 'idea', 'fahriye'];
      return targetCafes.some(target => cafeName.includes(target));
    }
    if (filterType === 'quiet') {
      const targetCafes = ['penguen', 'nevmekan', 'fahriye', 'zemin', 'minoa'];
      return targetCafes.some(target => cafeName.includes(target));
    }
    return true;
  });

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        try {
          const cachedData = localStorage.getItem(CACHE_KEY);
          const geocodeCache = cachedData ? JSON.parse(cachedData) : {};
          
          let toGeocode: string[] = [];

          const parsedCafes: Cafe[] = results.data
            .filter((row: any) => row['Adı'] && row['Adı'].trim() !== '')
            .map((row: any) => {
              const name = row['Adı']?.trim();
              const district = row['İlçe Adı'] || '';
              const address = row['Adres'] || '';
              const searchKey = `${name}, ${district}`;
              
              let coords = GeocodeManualMap[name];
              let isGeocoding = false;

              if (!coords) {
                if (geocodeCache[searchKey]) {
                  coords = geocodeCache[searchKey];
                } else if (geocodeCache[address]) {
                  coords = geocodeCache[address];
                } else {
                  coords = getApproximateCoords(district);
                  isGeocoding = true;
                  toGeocode.push(searchKey);
                }
              }
              
              return {
                name: name,
                type: row['Mekan Türü'] || t('data.unknown'),
                district: district || t('data.unknown'),
                year: row['Açılış Yılı'] || '-',
                address: address || t('data.noAddress'),
                phone: row['Telefon'] || '-',
                hours: row['Çalışma Saatleri'] || t('data.unspecified'),
                campaign: row['Kampanya / Ekonomik Durum'] || t('data.noInfo'),
                lat: coords.lat,
                lng: coords.lng,
                isGeocoding
              };
            });
            
          setCafes(parsedCafes);
          setLoading(false);

          if (toGeocode.length > 0 && !processingQueue.current) {
            processGeocodingQueue(parsedCafes, toGeocode, geocodeCache);
          }
        } catch (err: any) {
          setError(err.message || t('map.error'));
          setLoading(false);
        }
      },
      error: (error) => {
        setError(error.message || t('map.error'));
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const processGeocodingQueue = async (currentCafes: Cafe[], queries: string[], cache: any) => {
    processingQueue.current = true;
    setGeocodingProgress({ current: 0, total: queries.length });
    
    // Copy the array so we can progressively resolve items
    let updatedCafes = [...currentCafes];

    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        
        // Wait 1.1s between nominatim requests to prevent rate limit (max 1/sec)
        await new Promise(r => setTimeout(r, 1100));

        try {
            // query format: "Cafe Name, District, Istanbul"
            const apiQuery = encodeURIComponent(`${query}, Istanbul`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${apiQuery}&limit=1`);
            const data = await res.json();

            let foundLat: number | null = null;
            let foundLng: number | null = null;

            if (data && data.length > 0) {
               foundLat = parseFloat(data[0].lat);
               foundLng = parseFloat(data[0].lon);
            }

            if (foundLat && foundLng) {
               cache[query] = { lat: foundLat, lng: foundLng };
               // Update precise coords
               updatedCafes = updatedCafes.map(c => 
                 (`${c.name}, ${c.district}` === query) 
                   ? { ...c, lat: foundLat!, lng: foundLng!, isGeocoding: false } 
                   : c
               );
            } else {
               // Mark as unresolvable so we don't spam the API on reload
               const approx = getApproximateCoords(query);
               cache[query] = approx;
               updatedCafes = updatedCafes.map(c => 
                 (`${c.name}, ${c.district}` === query) 
                   ? { ...c, isGeocoding: false, lat: approx.lat, lng: approx.lng } 
                   : c
               );
            }

            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            setCafes(updatedCafes);
            setGeocodingProgress({ current: i + 1, total: queries.length });

        } catch (err) {
            console.error("Geocoding failed for", query, err);
        }
    }
    setGeocodingProgress(null);
    processingQueue.current = false;
  };

  function getApproximateCoords(district: string) {
    if (district?.toLowerCase().includes('kadıköy')) return { lat: 40.988 + (Math.random() * 0.01 - 0.005), lng: 29.025 + (Math.random() * 0.01 - 0.005) };
    if (district?.toLowerCase().includes('üsküdar')) return { lat: 41.025 + (Math.random() * 0.01 - 0.005), lng: 29.015 + (Math.random() * 0.01 - 0.005) };
    return { lat: 40.990 + (Math.random() * 0.04 - 0.02), lng: 29.030 + (Math.random() * 0.04 - 0.02) };
  }

  const tileUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <div className="flex h-[calc(100vh-100px)] lg:h-full w-full relative z-0 flex-1 overflow-hidden font-sans">
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer 
          center={startPosition} 
          zoom={13} 
          zoomControl={false}
          scrollWheelZoom={true} 
          className="w-full h-full" 
        >
          <TileLayer
            key={theme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={tileUrl}
          />
          <ZoomControl position="bottomright" />
          
          {!loading && displayedCafes.map((cafe, i) => (
            <Marker key={i} position={[cafe.lat, cafe.lng]} opacity={cafe.isGeocoding ? 0.6 : 1}>
              <Tooltip direction="top" offset={[0, -35]} opacity={1} className="custom-tooltip" interactive={false}>
                 <div className="px-3 py-2 text-slate-800 dark:text-slate-200">
                    <div className="font-semibold text-sm leading-tight">{cafe.name}</div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mt-0.5">{cafe.district}</div>
                 </div>
              </Tooltip>

              <Popup className="custom-popup">
                <div className="flex flex-col dark:bg-slate-800">
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
                    <span className="text-[10px] font-bold tracking-widest text-slate-300 block mb-1">
                      {cafe.district.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
                    </span>
                    <h3 className="font-semibold text-lg m-0 leading-tight">
                      {cafe.name}
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 bg-white dark:bg-slate-800 transition-colors">
                    <p className="text-sm text-slate-600 dark:text-slate-300 flex gap-2 items-start leading-snug">
                       <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                       <span>{cafe.address}</span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 flex gap-2 items-center">
                       <Coffee className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                       <span>{cafe.phone !== '-' ? cafe.phone : t('data.unspecified')}</span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 flex gap-2 items-center">
                      <svg className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {cafe.hours}
                    </p>
                    {cafe.campaign && cafe.campaign !== 'Bilgi yok' && cafe.campaign !== t('data.noInfo') && (
                      <div className="mt-2 bg-indigo-50/50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-200 text-xs p-2.5 rounded-lg flex gap-2 items-start">
                        <span className="text-indigo-500 dark:text-indigo-400">✨</span>
                        <span className="leading-relaxed font-medium">{cafe.campaign}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className={`
        absolute z-[500] 
        lg:top-6 lg:left-6 lg:w-[400px] lg:bottom-6
        top-0 left-0 w-full h-[60vh] lg:h-auto
        transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${showMobileList ? 'translate-y-0' : 'translate-y-[calc(100vh)] lg:translate-y-0'}
        flex flex-col
      `}>
        <div className="h-full w-full bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 lg:rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden transition-colors duration-300">
          
          <div className="p-6 border-b border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Coffee className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                {t('map.spots')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium pl-7">{t('map.region')}</p>
            </div>
            <span className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
              {isAnyFilterActive && (
                 <button 
                   title="Filtreyi Temizle"
                   onClick={() => setSearchParams({})} 
                   className="flex items-center justify-center w-4 h-4 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-full"
                 >
                   &times;
                 </button>
              )}
              {displayedCafes.length} {t('map.spotCount')}
            </span>
          </div>
          
          {geocodingProgress && (
             <div className="bg-indigo-50 dark:bg-indigo-900/30 px-6 py-2 border-b border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                   <Loader2 className="w-3 h-3 animate-spin"/>
                   {t('map.optimizing')}
                </div>
                <div className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500">{geocodingProgress.current}/{geocodingProgress.total}</div>
             </div>
          )}
          
          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 dark:text-indigo-400 mb-3" />
                <span className="text-sm font-medium animate-pulse">{t('map.loading')}</span>
              </div>
            )}
            
            {error && (
              <div className="p-4 mx-4 my-4 bg-red-50/80 dark:bg-red-900/30 backdrop-blur border border-red-100 dark:border-red-800 rounded-xl text-center text-sm text-red-600 dark:text-red-400">
                {t('map.error')}
              </div>
            )}
            
            {!loading && !error && displayedCafes.length === 0 && (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 font-bold flex flex-col items-center gap-3">
                {t('map.notFound').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
                {isAnyFilterActive && (
                  <button onClick={() => setSearchParams({})} className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-full transition-colors">Tüm Mekanları Göster</button>
                )}
              </div>
            )}

            <div className="p-3 space-y-2">
              {!loading && displayedCafes.map((cafe, index) => (
                <div key={index} className="group bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-800/90 border border-transparent hover:border-white/80 dark:hover:border-slate-600 rounded-xl p-4 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex justify-between items-center relative overflow-hidden">
                  
                  {cafe.isGeocoding && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-200 dark:bg-indigo-800 animate-pulse" title={t('map.searching')}></div>
                  )}

                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded tracking-wide">
                        {cafe.district.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{cafe.type}</span>
                    </div>
                    <h3 className="text-slate-900 dark:text-white font-semibold mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {cafe.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{cafe.address}</p>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/50 flex items-center justify-center shrink-0 transition-colors">
                    {cafe.isGeocoding ? (
                       <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    ) : (
                       <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-300 group-hover:text-indigo-500 dark:group-hover:text-indigo-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-[600]">
        <button 
          onClick={() => setShowMobileList(!showMobileList)}
          className="bg-slate-900 dark:bg-indigo-600 text-white shadow-xl rounded-full px-6 py-3.5 font-medium text-sm flex items-center gap-2 transition-transform active:scale-95 border border-slate-700/50 dark:border-indigo-500 backdrop-blur-md"
        >
          <Navigation className="w-4 h-4" />
          {showMobileList ? t('map.showMap') : t('map.showList')}
        </button>
      </div>
    </div>
  );
}

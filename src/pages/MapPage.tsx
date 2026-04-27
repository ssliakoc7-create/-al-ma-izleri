import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Papa from 'papaparse';
import { Loader2, Navigation, Coffee, MapPin, ChevronRight, Info, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

import { ADDITIONAL_CAFES, Cafe as DataCafe } from '../data/cafes';

interface Cafe extends DataCafe {
  isGeocoding?: boolean;
}

const getVenueIcon = (cafe: Cafe, isFav: boolean) => {
  const isLibrary = cafe.type.toLowerCase().includes('kütüphane') || cafe.type.toLowerCase().includes('kitap');
  const isMunicipal = cafe.type.toLowerCase().includes('belediye') || cafe.type.toLowerCase().includes('tesis');
  
  let bgColor = '#FFD700'; // Vibrant Yellow
  // All icons are now books as requested
  const bookPath = `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`;
  let iconPath = bookPath; 
  
  if (isLibrary) {
    bgColor = '#10b981'; // Emerald Green
  } else if (isMunicipal) {
    bgColor = '#3b82f6'; // Bright Blue
  }

  if (isFav) {
    bgColor = '#f43f5e'; // Rose Red
  }

  return L.divIcon({
    className: 'custom-brutalist-marker',
    html: `
      <div class="relative group">
        <div class="flex flex-col items-center transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110">
          <div class="w-12 h-12 border-4 border-black shadow-[6px_6px_0_0_#000] flex items-center justify-center rounded-xl marker-bounce relative overflow-hidden" style="background-color: ${bgColor}">
            <!-- Glint effect -->
            <div class="absolute top-0 left-0 w-full h-1/2 bg-white/20 -skew-x-12 -translate-x-1/2 -translate-y-1/2"></div>
            
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${isFav ? 'white' : 'none'}" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-black relative z-10">
              ${isFav ? `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>` : iconPath}
            </svg>
          </div>
          <!-- Pointer -->
          <div class="w-4 h-4 bg-black rotate-45 -mt-2 shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]"></div>
        </div>
      </div>
    `,
    iconSize: [48, 56],
    iconAnchor: [24, 56],
    popupAnchor: [0, -56],
  });
};

L.Marker.prototype.options.icon = L.divIcon({ className: '' }); // Reset default to avoid issues

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQakb_z6zgEh4TzMwNShKSn3vTGa4wY9c-XwN6Mp_fZ2aQYnflQQJ5AD1mhoJhUi0P6wxtHxT6HeOV/pub?output=csv';
const CACHE_KEY = 'v1_geocode_cache_istanbul_cafes';

const GeocodeManualMap: Record<string, {lat: number, lng: number}> = {}; // Moved to static data

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function MapPage() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cafes, setCafes] = useState<Cafe[]>([...ADDITIONAL_CAFES]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{current: number, total: number} | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [proximityFilter, setProximityFilter] = useState(false);
  
  const processingQueue = useRef(false);
  const startPosition: [number, number] = [40.988, 29.025]; 

  const filterType = searchParams.get('filter');
  const isAnyFilterActive = !!filterType || searchTerm.length > 0 || proximityFilter;

  const handleLocateAndFilter = () => {
    if (!navigator.geolocation) {
      alert(language === 'tr' ? 'Tarayıcınız konum özelliğini desteklemiyor.' : 'Your browser does not support location features.');
      return;
    }

    if (proximityFilter) {
      // Toggle off
      setProximityFilter(false);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setLocating(false);
        setProximityFilter(true);
      },
      (error) => {
        console.error("Location error:", error);
        setLocating(false);
        alert(language === 'tr' ? 'Konum erişimi reddedildi veya bir hata oluştu.' : 'Location access denied or an error occurred.');
      },
      { enableHighAccuracy: true }
    );
  };

  const MapController = () => {
    const map = useMap();
    useEffect(() => {
      if (userLocation) {
        map.flyTo(userLocation, 15);
      }
    }, [userLocation, map]);
    return null;
  };

  const displayedCafes = cafes.filter(cafe => {
    const cafeName = cafe.name.toLowerCase();
    const cafeDistrict = cafe.district.toLowerCase();
    const term = searchTerm.toLowerCase();
    
    const searchMatch = cafeName.includes(term) || cafeDistrict.includes(term);
    if (!searchMatch) return false;

    if (proximityFilter && userLocation) {
      const distance = calculateDistance(userLocation[0], userLocation[1], cafe.lat, cafe.lng);
      if (distance > 2) return false;
    }

    if (!filterType) return true;
    
    if (filterType === 'campaign') {
      return cafe.features.includes('campaign') || ['kemp', 'espressolab', 'kahve dünyası', 'idea'].some(target => cafeName.includes(target));
    }
    if (filterType === 'wifi') {
      return cafe.features.includes('wifi') || ['penguen', 'zemin', 'idea', 'nevmekan'].some(target => cafeName.includes(target));
    }
    if (filterType === 'plug') {
      return cafe.features.includes('plug') || ['espressolab', 'kahve dünyası', 'zemin', 'idea', 'minoa'].some(target => cafeName.includes(target));
    }
    if (filterType === 'student') {
      return cafe.features.includes('student') || ['beltur', 'kemp', 'nevmekan', 'idea', 'fahriye'].some(target => cafeName.includes(target));
    }
    if (filterType === 'quiet') {
      return cafe.features.includes('quiet') || ['penguen', 'nevmekan', 'fahriye', 'zemin', 'minoa'].some(target => cafeName.includes(target));
    }
    if (filterType === 'favorites') {
      return isFavorite(cafe.name);
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

          // Start with our rich static data
          const mergedCafes: Cafe[] = [...ADDITIONAL_CAFES];

          // Add CSV data if it's not already in our static list
          results.data
            .filter((row: any) => row['Adı'] && row['Adı'].trim() !== '')
            .forEach((row: any) => {
              const name = row['Adı']?.trim();
              if (mergedCafes.some(c => c.name === name)) return;

              const district = row['İlçe Adı'] || '';
              const address = row['Adres'] || '';
              const searchKey = `${name}, ${district}`;
              
              let coords = geocodeCache[searchKey] || geocodeCache[address] || getApproximateCoords(district);
              let isGeocoding = !geocodeCache[searchKey] && !geocodeCache[address];
              if (isGeocoding) toGeocode.push(searchKey);

              const cafeImages = [
                "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop"
              ];
              const randomImage = cafeImages[mergedCafes.length % cafeImages.length];
              
              mergedCafes.push({
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
                imageUrl: randomImage,
                features: [],
                isGeocoding
              });
            });
            
          setCafes(mergedCafes);
          setLoading(false);

          if (toGeocode.length > 0 && !processingQueue.current) {
            processGeocodingQueue(mergedCafes, toGeocode, geocodeCache);
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
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="flex h-[calc(100vh-100px)] lg:h-full w-full relative z-0 flex-1 overflow-hidden font-sans">
      <div className="absolute inset-0 w-full h-full z-0">
        {theme !== 'dark' && (
          <div 
            className="absolute inset-0 z-[400] pointer-events-none opacity-[0.03] mix-blend-multiply" 
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/paper-fibers.png')" }}
          ></div>
        )}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3 pointer-events-none">
          <button 
            onClick={handleLocateAndFilter}
            disabled={locating}
            className={`pointer-events-auto border-4 border-black p-3 shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] active:translate-y-0 active:shadow-none transition-all flex items-center gap-3 rounded-sm font-black text-xs uppercase tracking-widest ${
              proximityFilter 
                ? 'bg-yellow-500 text-white' 
                : 'bg-white dark:bg-slate-800 text-black dark:text-white'
            }`}
            title={t('map.proximity')}
          >
            {locating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Navigation className={`w-6 h-6 ${proximityFilter ? 'fill-white' : ''}`} />
            )}
            <span className="hidden md:inline">
              {proximityFilter ? t('map.proximity') : t('map.locateAndNearMe')}
            </span>
          </button>
        </div>
        <MapContainer 
          center={startPosition} 
          zoom={13} 
          zoomControl={false}
          scrollWheelZoom={true} 
          className="w-full h-full" 
          style={{ 
            filter: theme === 'dark' 
              ? 'none' 
              : 'sepia(0.05) brightness(1.02) contrast(1.0) saturate(1.2)' 
          }}
        >
          <TileLayer
            key={theme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={tileUrl}
          />
          <MapController />
          <ZoomControl position="bottomright" />

          {userLocation && (
            <Marker 
              position={userLocation}
              icon={L.divIcon({
                className: '',
                html: `
                  <div class="relative">
                    <div class="w-6 h-6 bg-blue-500 border-4 border-white rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <div class="absolute -inset-2 bg-blue-400 bg-opacity-30 rounded-full animate-ping"></div>
                  </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            />
          )}
          
          {!loading && displayedCafes.map((cafe, i) => (
            <Marker 
              key={i} 
              position={[cafe.lat, cafe.lng]} 
              opacity={cafe.isGeocoding ? 0.6 : 1}
              icon={getVenueIcon(cafe, isFavorite(cafe.name))}
            >
              <Tooltip direction="top" offset={[0, -40]} opacity={1} className="custom-tooltip" interactive={false}>
                 <div className="px-4 py-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#FFD700] dark:text-yellow-400 mb-1">{cafe.district}</div>
                    <div className="font-black text-sm leading-tight flex items-center gap-2 text-black dark:text-white uppercase tracking-tighter">
                      {cafe.name}
                      {isFavorite(cafe.name) && <Heart className="w-3 h-3 fill-red-500 text-red-500" />}
                    </div>
                 </div>
              </Tooltip>

               <Popup className="custom-popup">
                <div className="flex flex-col bg-white dark:bg-slate-800 w-72 overflow-hidden border-4 border-black dark:border-slate-700 shadow-[8px_8px_0_0_#000]">
                  <div className="relative h-40 w-full overflow-hidden border-b-4 border-black dark:border-slate-700">
                    <img 
                      src={cafe.imageUrl} 
                      alt={cafe.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop";
                      }}
                    />
                    <div className="absolute top-2 left-2 px-3 py-1 bg-[#FFD700] border-2 border-black text-black text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#000]">
                      {cafe.district}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(cafe.name);
                        }}
                        className="p-2 bg-white dark:bg-slate-900 border-2 border-black rounded-full shadow-[3px_3px_0_0_#000] hover:bg-red-50 transition-colors"
                      >
                        <Heart className={`w-5 h-5 ${isFavorite(cafe.name) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-3 bg-white dark:bg-slate-800 transition-colors">
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-xl m-0 leading-tight text-black dark:text-white uppercase tracking-tight">
                        {cafe.name}
                      </h3>
                    </div>
                    <div className="space-y-2 pt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
                      <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex gap-3 items-start leading-snug">
                         <MapPin className="w-4 h-4 shrink-0 text-yellow-600" />
                         <span className="line-clamp-2">{cafe.address}</span>
                      </p>
                      {cafe.campaign && (
                        <div className="bg-black text-white dark:bg-yellow-900 text-[10px] p-3 border-2 border-black flex gap-3 items-start mt-4 shadow-[4px_4px_0_0_#FFD700]">
                          <span className="text-xl">✨</span>
                          <span className="leading-tight font-black uppercase tracking-widest">{cafe.campaign}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 mt-2">
                       <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name + ' ' + cafe.district)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-full py-3 text-[10px] font-black tracking-[0.2em] uppercase text-black dark:text-white border-4 border-black dark:border-slate-600 bg-white hover:bg-[#FFD700] dark:bg-slate-800 dark:hover:bg-yellow-600 transition-all shadow-[6px_6px_0_0_#000] active:translate-y-0.5 active:shadow-none"
                      >
                        {t('app.getDirections')}
                      </a>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className={`
        absolute z-[500] 
        lg:top-4 lg:right-4 lg:w-[420px] lg:bottom-4
        top-0 left-0 w-full h-[65vh] lg:h-auto
        transform transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)
        ${showMobileList ? 'translate-y-0 shadow-none' : 'translate-y-[calc(100vh-80px)] lg:translate-y-0'}
        flex flex-col
      `}>
        <div className="h-full w-full bg-white dark:bg-slate-900 border-4 border-black dark:border-slate-700 shadow-[10px_10px_0_0_#000] dark:shadow-[10px_10px_0_0_#ca8a04] flex flex-col overflow-hidden">
          
          <div className="p-6 border-b-4 border-black dark:border-slate-700 bg-[#FFD700] dark:bg-yellow-600 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-2xl font-black text-black dark:text-white tracking-widest flex items-center gap-2 uppercase">
                <Coffee className="h-6 w-6" />
                {t('map.spots')}
              </h2>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-black/60 dark:text-white/60" />
                <p className="text-[10px] text-black/60 dark:text-white/60 font-black uppercase tracking-tighter">{t('map.region')}</p>
              </div>
            </div>
            <div className="bg-black text-white dark:bg-slate-900 dark:text-yellow-400 font-black text-xs px-3 py-2 border-2 border-black dark:border-yellow-500 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
              {displayedCafes.length} PTS
            </div>
          </div>
          
          {geocodingProgress && (
             <div className="bg-yellow-50 dark:bg-yellow-900/30 px-6 py-2 border-b border-yellow-100 dark:border-yellow-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-yellow-600 dark:text-yellow-300">
                   <Loader2 className="w-3 h-3 animate-spin"/>
                   {t('map.optimizing')}
                </div>
                <div className="text-[10px] font-bold text-yellow-400 dark:text-yellow-500">{geocodingProgress.current}/{geocodingProgress.total}</div>
             </div>
          )}
          
          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-[#F2F2EC] dark:bg-slate-950 p-4">
            <div className="relative mb-6 group">
              <input 
                type="text" 
                placeholder={t('map.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border-4 border-black dark:border-slate-700 px-4 py-3 font-black text-xs uppercase tracking-widest outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-[#FFD700] dark:focus:bg-yellow-600 focus:text-black dark:focus:text-white transition-all shadow-[4px_4px_0_0_#000] group-hover:shadow-[6px_6px_0_0_#000]"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Navigation className="w-4 h-4 text-black dark:text-white transform rotate-45" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {['wifi', 'plug', 'student', 'quiet', 'campaign', 'favorites'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSearchParams(filterType === f ? {} : { filter: f })}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 border-black transition-all shadow-[3px_3px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                    filterType === f 
                      ? 'bg-black text-white' 
                      : 'bg-white hover:bg-[#FFD700] text-black dark:bg-slate-800 dark:text-white dark:hover:bg-yellow-600'
                  }`}
                >
                  {f === 'favorites' ? '★ ' : ''}
                  {t(`filter.${f}`)}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-yellow-500 dark:text-yellow-400 mb-3" />
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
                {filterType === 'favorites' 
                  ? (language === 'tr' ? 'HENÜZ FAVORİ MEKANINIZ YOK.' : 'NO FAVORITE SPOTS YET.')
                  : t('map.notFound').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')
                }
                {isAnyFilterActive && (
                  <button onClick={() => {
                    setSearchParams({});
                    setSearchTerm('');
                    setProximityFilter(false);
                  }} className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-full transition-colors border-2 border-black">
                    {language === 'tr' ? 'Tüm Mekanları Göster' : 'Show All Spots'}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-4">
              {!loading && displayedCafes.map((cafe, index) => (
                <div 
                  key={index} 
                  className="group bg-white dark:bg-slate-800 border-4 border-black dark:border-slate-700 p-5 transition-all shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-black dark:text-white bg-[#FFD700] dark:bg-yellow-600 px-2 py-1 border-2 border-black uppercase tracking-widest">
                      {cafe.district}
                    </span>
                    <div className="flex gap-2 relative z-10 shrink-0">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           toggleFavorite(cafe.name);
                         }}
                         className="p-2 bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-600 rounded-full shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#ca8a04] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                       >
                         <Heart className={`w-5 h-5 ${isFavorite(cafe.name) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                       </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-black dark:text-white leading-tight mb-2 group-hover:text-yellow-600 transition-colors">
                    {cafe.name}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest line-clamp-1">{cafe.address}</p>
                  
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{cafe.type}</span>
                      <div className="flex items-center gap-1 text-xs font-black text-black dark:text-white group-hover:underline">
                        DETAY <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name + ' ' + cafe.district)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center w-full py-3 text-[10px] font-black tracking-[0.2em] uppercase text-black dark:text-white border-2 border-black dark:border-slate-600 bg-white hover:bg-[#FFD700] dark:bg-slate-800 dark:hover:bg-yellow-600 transition-all shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-none"
                    >
                      {t('app.getDirections')}
                    </a>
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
          className="bg-black dark:bg-yellow-600 text-white shadow-[8px_8px_0_0_#FFD700] hover:shadow-none rounded-full px-8 py-4 font-black transition-all active:scale-95 border-4 border-black dark:border-yellow-500 flex items-center gap-3 uppercase tracking-widest text-xs"
        >
          <Navigation className="w-5 h-5" />
          {showMobileList ? t('map.showMap') : t('map.showList')}
        </button>
      </div>
    </div>
  );
}

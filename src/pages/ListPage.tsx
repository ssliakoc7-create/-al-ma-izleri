import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Papa from 'papaparse';
import { Loader2, Coffee, MapPin, Map as MapIcon, ArrowLeft, ExternalLink, Heart, Navigation } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQakb_z6zgEh4TzMwNShKSn3vTGa4wY9c-XwN6Mp_fZ2aQYnflQQJ5AD1mhoJhUi0P6wxtHxT6HeOV/pub?output=csv';

import { ADDITIONAL_CAFES, Cafe as DataCafe } from '../data/cafes';

interface Cafe extends DataCafe {}

export default function ListPage() {
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchParams] = useSearchParams();
  const [cafes, setCafes] = useState<Cafe[]>([...ADDITIONAL_CAFES]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filterType = searchParams.get('filter');

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        try {
          // Merge static with CSV
          const mergedCafes: Cafe[] = [...ADDITIONAL_CAFES];

          if (results.data && results.data.length > 0) {
            results.data
              .filter((row: any) => row['Adı'] && row['Adı'].trim() !== '')
              .forEach((row: any, index: number) => {
                const name = row['Adı']?.trim();
                if (mergedCafes.some(c => c.name === name)) return;

                // Use a variety of professional cafe images from Unsplash
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
                const randomImage = cafeImages[index % cafeImages.length];

                mergedCafes.push({
                  name: name,
                  type: row['Mekan Türü'] || t('data.unknown'),
                  district: row['İlçe Adı'] || t('data.unknown'),
                  year: row['Açılış Yılı'] || '-',
                  address: row['Adres'] || t('data.noAddress'),
                  phone: row['Telefon'] || '-',
                  hours: row['Çalışma Saatleri'] || t('data.unspecified'),
                  campaign: row['Kampanya / Ekonomik Durum'] || t('data.noInfo'),
                  lat: 0, 
                  lng: 0,
                  imageUrl: randomImage,
                  features: []
                });
              });
          }

          setCafes(mergedCafes);
          setLoading(false);
        } catch (err: any) {
          console.error(err);
          setCafes([...ADDITIONAL_CAFES]);
          setLoading(false);
        }
      },
      error: (error) => {
        console.error(error);
        setCafes([...ADDITIONAL_CAFES]);
        setLoading(false);
      }
    });
  }, [t]);

  const displayedCafes = cafes.filter(cafe => {
    const cafeName = cafe.name.toLowerCase();
    const cafeDistrict = cafe.district.toLowerCase();
    const term = searchTerm.toLowerCase();
    
    const searchMatch = cafeName.includes(term) || cafeDistrict.includes(term);
    if (!searchMatch) return false;

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

  const getFilterTitle = () => {
    switch(filterType) {
      case 'wifi': return t('feat.wifi.title');
      case 'plug': return t('feat.plug.title');
      case 'student': return t('feat.student.title');
      case 'quiet': return t('feat.quiet.title');
      case 'campaign': return t('app.campaigns');
      case 'favorites': return t('app.favorites');
      default: return t('map.spots');
    }
  };

  return (
    <div className="flex-1 bg-[#F2F2EC] dark:bg-slate-950 p-6 sm:p-12 overflow-y-auto no-scrollbar font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-8 border-black dark:border-yellow-500 pb-8 rounded-sm">
          <div>
            <Link to="/" className="inline-flex items-center text-sm font-bold tracking-widest text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-yellow-400 transition-colors mb-6 uppercase">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('app.home')}
            </Link>
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-black dark:text-white tracking-tighter leading-none break-words">
              {getFilterTitle().toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
            </h2>
            <p className="mt-4 text-lg md:text-xl font-bold tracking-widest text-[#FFD700] dark:text-yellow-400 uppercase bg-black dark:bg-yellow-950 px-4 py-1 inline-block border-2 border-black">
              {displayedCafes.length} {t('map.spotCount')}
            </p>
          </div>
          
          <Link 
            to={`/harita${filterType ? `?filter=${filterType}` : ''}`} 
            className="inline-flex items-center justify-center px-6 py-4 text-sm font-black tracking-[0.2em] uppercase text-black dark:text-white bg-white dark:bg-slate-800 border-4 border-black dark:border-yellow-700 hover:bg-[#FFD700] hover:text-black dark:hover:bg-yellow-600 dark:hover:border-black transition-all shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#422006]"
          >
            <MapIcon className="mr-3 h-5 w-5" />
            {t('map.showMap')}
          </Link>
        </div>

        <div className="mb-12 relative group max-w-2xl">
          <input 
            type="text" 
            placeholder={t('map.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border-4 border-black dark:border-slate-700 px-6 py-5 font-black text-lg uppercase tracking-widest outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-[#FFD700] dark:focus:bg-yellow-600 focus:text-black dark:focus:text-white transition-all shadow-[8px_8px_0_0_#000] group-hover:shadow-[12px_12px_0_0_#000]"
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
            <Navigation className="w-6 h-6 text-black dark:text-white transform rotate-45" />
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-yellow-500 dark:text-yellow-400 mb-6" />
            <span className="text-xl font-black tracking-widest uppercase">{t('map.loading')}</span>
          </div>
        )}

        {!loading && !error && displayedCafes.length === 0 && (
          <div className="py-20 text-center border-4 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[12px_12px_0_0_#000]">
            <p className="text-2xl font-black tracking-widest text-black dark:text-white mb-8 uppercase">
              {filterType === 'favorites' ? (language === 'tr' ? 'HENÜZ FAVORİ MEKANINIZ YOK.' : 'YOU HAVE NO FAVORITE SPOTS YET.') : t('map.notFound')}
            </p>
            {filterType && (
              <Link to="/liste" className="inline-block px-10 py-5 bg-[#FFD700] dark:bg-yellow-600 text-black dark:text-white font-black tracking-widest uppercase text-sm border-4 border-black dark:border-yellow-500 hover:bg-black hover:text-white transition-all shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#422006]">
                {language === 'tr' ? 'Tüm Mekanları Göster' : 'View All Spots'}
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {!loading && displayedCafes.map((cafe, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 border-4 border-black dark:border-slate-700 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#0f172a] hover:-translate-y-2 hover:shadow-[20px_20px_0_0_#000] dark:hover:shadow-[20px_20px_0_0_#0f172a] transition-all flex flex-col group overflow-hidden">
              <div className="relative h-48 overflow-hidden border-b-4 border-black dark:border-slate-700">
                <img 
                  src={cafe.imageUrl} 
                  alt={cafe.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop";
                  }}
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="inline-block px-3 py-1 bg-[#FFD700] dark:bg-yellow-600 text-black dark:text-white text-xs font-black tracking-widest border-2 border-black dark:border-yellow-500 uppercase shadow-[4px_4px_0_0_#000]">
                    {cafe.district}
                  </span>
                  {isFavorite(cafe.name) && (
                    <span className="inline-block p-1 bg-white dark:bg-slate-900 border-2 border-black dark:border-yellow-500 rounded shadow-[4px_4px_0_0_#000]">
                      <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => toggleFavorite(cafe.name)}
                  className="absolute top-4 right-4 p-3 bg-white dark:bg-slate-900 border-4 border-black dark:border-yellow-500 rounded-full hover:bg-[#FFD700] hover:scale-110 active:scale-95 transition-all shadow-[6px_6px_0_0_#000] z-10 group/fav"
                >
                  <Heart className={`w-6 h-6 transition-colors ${isFavorite(cafe.name) ? 'fill-red-500 text-red-500' : 'text-black dark:text-white group-hover/fav:text-black'}`} />
                </button>
              </div>
              
              <div className="p-6 md:p-8 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <h3 className="text-3xl font-black text-black dark:text-white leading-tight group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                    {cafe.name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right shrink-0 mt-2">
                    {cafe.type}
                  </span>
                </div>
                
                <div className="space-y-4 mb-8 flex-1">
                  <p className="flex items-start text-sm font-medium text-slate-600 dark:text-slate-300">
                    <MapPin className="w-5 h-5 mr-3 shrink-0 text-yellow-500" />
                    {cafe.address}
                  </p>
                  <p className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Coffee className="w-5 h-5 mr-3 shrink-0 text-yellow-500" />
                    {cafe.phone !== '-' ? cafe.phone : t('data.unspecified')}
                  </p>
                </div>
                
                {cafe.campaign && (cafe.campaign !== 'Bilgi yok' && cafe.campaign !== t('data.noInfo')) && (
                  <div className="bg-black dark:bg-yellow-900 border-2 border-black dark:border-yellow-700 p-4 mb-6 shadow-[4px_4px_0_0_#FFD700]">
                    <p className="text-sm font-bold text-white dark:text-yellow-100 leading-relaxed uppercase tracking-wider">
                      <span className="mr-2">✨</span>
                      {cafe.campaign}
                    </p>
                  </div>
                )}
                
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name + ' ' + cafe.district)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto flex items-center justify-center w-full py-5 text-sm font-black tracking-[0.2em] uppercase text-black dark:text-white border-4 border-black dark:border-slate-600 bg-white hover:bg-[#FFD700] dark:bg-slate-800 dark:hover:bg-yellow-600 transition-all shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#0f172a] hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#000] active:translate-y-0 active:shadow-none"
                >
                  {t('app.getDirections')} <ExternalLink className="w-5 h-5 ml-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

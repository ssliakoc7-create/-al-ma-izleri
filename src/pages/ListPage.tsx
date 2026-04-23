import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Papa from 'papaparse';
import { Loader2, Coffee, MapPin, Map as MapIcon, ArrowLeft, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQakb_z6zgEh4TzMwNShKSn3vTGa4wY9c-XwN6Mp_fZ2aQYnflQQJ5AD1mhoJhUi0P6wxtHxT6HeOV/pub?output=csv';

interface Cafe {
  name: string;
  type: string;
  district: string;
  year: string;
  address: string;
  phone: string;
  hours: string;
  campaign: string;
}

export default function ListPage() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterType = searchParams.get('filter');

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        try {
          const parsedCafes: Cafe[] = results.data
            .filter((row: any) => row['Adı'] && row['Adı'].trim() !== '')
            .map((row: any) => ({
              name: row['Adı']?.trim(),
              type: row['Mekan Türü'] || t('data.unknown'),
              district: row['İlçe Adı'] || t('data.unknown'),
              year: row['Açılış Yılı'] || '-',
              address: row['Adres'] || t('data.noAddress'),
              phone: row['Telefon'] || '-',
              hours: row['Çalışma Saatleri'] || t('data.unspecified'),
              campaign: row['Kampanya / Ekonomik Durum'] || t('data.noInfo'),
            }));
          setCafes(parsedCafes);
          setLoading(false);
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
  }, [t]);

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

  const getFilterTitle = () => {
    switch(filterType) {
      case 'wifi': return t('feat.wifi.title');
      case 'plug': return t('feat.plug.title');
      case 'student': return t('feat.student.title');
      case 'quiet': return t('feat.quiet.title');
      case 'campaign': return t('app.campaigns');
      default: return t('map.spots');
    }
  };

  return (
    <div className="flex-1 bg-[#F2F2EC] dark:bg-slate-950 p-6 sm:p-12 overflow-y-auto no-scrollbar font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-8 border-black dark:border-indigo-500 pb-8 rounded-sm">
          <div>
            <Link to="/" className="inline-flex items-center text-sm font-bold tracking-widest text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors mb-6 uppercase">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('app.home')}
            </Link>
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-black dark:text-white tracking-tighter leading-none break-words">
              {getFilterTitle().toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
            </h2>
            <p className="mt-4 text-lg md:text-xl font-bold tracking-widest text-slate-600 dark:text-slate-400 uppercase">
              {displayedCafes.length} {t('map.spotCount')}
            </p>
          </div>
          
          <Link 
            to={`/harita${filterType ? `?filter=${filterType}` : ''}`} 
            className="inline-flex items-center justify-center px-6 py-4 text-sm font-black tracking-[0.2em] uppercase text-black dark:text-white bg-white dark:bg-slate-800 border-4 border-black dark:border-slate-600 hover:bg-[#FFD700] hover:text-black dark:hover:bg-indigo-600 dark:hover:border-indigo-600 transition-all shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#0f172a]"
          >
            <MapIcon className="mr-3 h-5 w-5" />
            {t('map.showMap')}
          </Link>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 dark:text-indigo-400 mb-6" />
            <span className="text-xl font-black tracking-widest uppercase">{t('map.loading')}</span>
          </div>
        )}

        {!loading && !error && displayedCafes.length === 0 && (
          <div className="py-20 text-center border-4 border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
            <p className="text-2xl font-black tracking-widest text-slate-500 dark:text-slate-400 mb-6 uppercase">
              {t('map.notFound')}
            </p>
            {filterType && (
              <Link to="/liste" className="inline-block px-8 py-4 bg-black dark:bg-indigo-600 text-white font-black tracking-widest uppercase text-sm border-4 border-black dark:border-indigo-600 hover:bg-[#FFD700] hover:text-black hover:border-black transition-colors">
                Tüm Mekanları Göster
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {!loading && displayedCafes.map((cafe, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 border-4 border-black dark:border-slate-700 p-6 md:p-8 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#0f172a] hover:-translate-y-2 hover:shadow-[16px_16px_0_0_#000] dark:hover:shadow-[16px_16px_0_0_#0f172a] transition-all flex flex-col group">
              <div className="flex items-start justify-between mb-6 gap-4">
                <span className="inline-block px-3 py-1 bg-[#FFD700] dark:bg-indigo-600 text-black dark:text-white text-xs font-black tracking-widest border-2 border-black dark:border-indigo-500 uppercase">
                  {cafe.district}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                  {cafe.type}
                </span>
              </div>
              
              <h3 className="text-3xl font-black text-black dark:text-white leading-tight mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {cafe.name}
              </h3>
              
              <div className="space-y-4 mb-8 flex-1">
                <p className="flex items-start text-sm font-medium text-slate-600 dark:text-slate-300">
                  <MapPin className="w-5 h-5 mr-3 shrink-0 text-slate-400 dark:text-slate-500" />
                  {cafe.address}
                </p>
                <p className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Coffee className="w-5 h-5 mr-3 shrink-0 text-slate-400 dark:text-slate-500" />
                  {cafe.phone !== '-' ? cafe.phone : t('data.unspecified')}
                </p>
                <p className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300">
                   <svg className="w-5 h-5 mr-3 shrink-0 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {cafe.hours}
                </p>
              </div>
              
              {cafe.campaign && (cafe.campaign !== 'Bilgi yok' && cafe.campaign !== t('data.noInfo')) && (
                <div className="bg-indigo-50 dark:bg-slate-900 border-2 border-indigo-200 dark:border-slate-600 p-4 mt-auto mb-6">
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    <span className="mr-2">✨</span>
                    {cafe.campaign}
                  </p>
                </div>
              )}
              
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name + ' ' + cafe.district)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-auto flex items-center justify-center w-full py-4 text-xs font-black tracking-[0.2em] uppercase text-black dark:text-white border-2 border-black dark:border-slate-600 hover:bg-black hover:text-white dark:hover:bg-slate-700 transition-colors"
              >
                YOL TARİFİ <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

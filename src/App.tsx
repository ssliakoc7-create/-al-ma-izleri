import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import ListPage from './pages/ListPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <Router>
      <div className="min-h-screen bg-[#F2F2EC] dark:bg-slate-950 flex flex-col font-sans text-[#1A1A1A] dark:text-white sm:border-[12px] border-8 border-black dark:border-slate-800 transition-colors duration-300">
        <header className="border-b-[6px] border-black dark:border-slate-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-baseline bg-[#FFD700] dark:bg-slate-900/90 gap-4 transition-colors duration-300">
          <Link to="/" className="flex flex-col">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.8] text-black dark:text-white transition-colors duration-300">
              {t('app.title.1').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}<span className="block text-2xl sm:text-3xl mt-2 tracking-normal font-bold">{t('app.title.2').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</span>
            </h1>
          </Link>
          <div className="text-left sm:text-right flex flex-col items-start sm:items-end w-full sm:w-auto">
            <div className="flex gap-4 items-center mb-2">
              <Link 
                to="/liste?filter=campaign"
                className="text-xs font-black tracking-[0.2em] bg-white hover:bg-black text-black hover:text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white px-3 py-1.5 border-2 border-black dark:border-indigo-500 transition-colors cursor-pointer"
                title={t('app.campaigns')}
              >
                {t('app.campaigns').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
              </Link>
              <div className="flex gap-2">
                <button 
                  onClick={toggleLanguage} 
                  className="bg-black/10 dark:bg-white/10 px-3 h-8 flex items-center justify-center rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition-colors text-black dark:text-white font-bold text-xs"
                  title={t('app.langToggle')}
                >
                  {language === 'tr' ? (
                     <><span className="text-indigo-600 dark:text-indigo-400">TR</span><span className="mx-1 text-slate-400 dark:text-slate-500">/</span><span className="text-slate-500 font-normal">EN</span></>
                  ) : (
                     <><span className="text-slate-500 font-normal">TR</span><span className="mx-1 text-slate-400 dark:text-slate-500">/</span><span className="text-indigo-600 dark:text-indigo-400">EN</span></>
                  )}
                </button>
                <button 
                  onClick={toggleTheme} 
                  className="bg-black/10 dark:bg-white/10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition-colors text-black dark:text-white"
                  title={t('app.themeToggle')}
                >
                  {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </div>
            <nav className="flex gap-4 sm:gap-6 mt-1 w-full justify-between sm:justify-end">
              <Link to="/" className="text-xs sm:text-sm font-black tracking-widest text-black dark:text-white hover:underline decoration-[4px] underline-offset-4 transition-colors duration-300">{t('app.home').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</Link>
              <Link to="/harita" className="text-xs sm:text-sm font-black tracking-widest text-black dark:text-white hover:underline decoration-[4px] underline-offset-4 transition-colors duration-300">{t('app.map').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/harita" element={<MapPage />} />
            <Route path="/liste" element={<ListPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

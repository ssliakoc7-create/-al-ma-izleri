import React from 'react';
import { Link } from 'react-router-dom';
import { Map, Coffee, Wifi, Zap, Users, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LandingPage() {
  const { t, language } = useLanguage();
  
  return (
    <div className="flex flex-col flex-1 bg-[#F2F2EC] dark:bg-slate-950 transition-colors duration-300">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-24 border-b-[6px] border-black dark:border-slate-800 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none transition-opacity" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        <div className="max-w-4xl relative z-10 bg-[#F2F2EC] dark:bg-slate-900/80 backdrop-blur-sm p-8 border-4 border-black dark:border-slate-700 shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#1e293b] transition-all duration-300">
          <h1 className="text-6xl sm:text-8xl md:text-[100px] font-black text-black dark:text-white tracking-tighter leading-[0.9] mb-8 text-left break-words">
            {t('hero.line1').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}<br/>
            <span className="text-[#FFD700] dark:text-yellow-400" style={{ textShadow: 'none' }}>{t('hero.line2').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</span>
          </h1>
          <p className="text-xl sm:text-3xl font-bold tracking-wide text-black dark:text-slate-300 mb-12 leading-relaxed text-left border-l-[8px] border-black dark:border-yellow-500 pl-6">
            {t('hero.desc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-start">
            <Link 
              to="/harita" 
              className="group inline-flex items-center justify-center px-8 py-5 text-sm font-black tracking-[0.2em] text-[#FFD700] dark:text-white bg-black dark:bg-yellow-600 border-4 border-black dark:border-yellow-600 hover:bg-white dark:hover:bg-yellow-500 hover:text-black dark:hover:text-white hover:shadow-[12px_12px_0_0_#000] dark:hover:shadow-[12px_12px_0_0_#422006] transition-all"
            >
              <Map className="mr-3 h-5 w-5" />
              {t('hero.openMap').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
            </Link>
            <a 
              href="#features" 
              className="inline-flex items-center justify-center px-8 py-5 text-sm font-black tracking-[0.2em] text-black dark:text-slate-300 bg-white dark:bg-slate-800 border-4 border-black dark:border-slate-600 hover:bg-black dark:hover:bg-slate-700 hover:text-white dark:hover:text-white transition-all"
            >
              {t('hero.features').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#FFD700] dark:bg-yellow-900 border-b-[8px] border-black dark:border-yellow-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 border-b-8 border-black dark:border-white pb-8 inline-block transition-colors shadow-[8px_8px_0_0_#000]">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-black dark:text-white leading-none bg-white dark:bg-black px-4 py-2 border-4 border-black">{t('features.title').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</h2>
            <p className="mt-4 text-xl font-bold tracking-widest text-black dark:text-yellow-200 px-4">{t('features.subtitle').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              to="/liste?filter=wifi"
              icon={<Wifi className="h-10 w-10 text-black dark:text-white" />}
              title={t('feat.wifi.title')}
              description={t('feat.wifi.desc')}
              language={language}
            />
            <FeatureCard 
              to="/liste?filter=plug"
              icon={<Zap className="h-10 w-10 text-black dark:text-white" />}
              title={t('feat.plug.title')}
              description={t('feat.plug.desc')}
              language={language}
            />
            <FeatureCard 
              to="/liste?filter=student"
              icon={<Coffee className="h-10 w-10 text-black dark:text-white" />}
              title={t('feat.student.title')}
              description={t('feat.student.desc')}
              language={language}
            />
            <FeatureCard 
              to="/liste?filter=quiet"
              icon={<Users className="h-10 w-10 text-black dark:text-white" />}
              title={t('feat.quiet.title')}
              description={t('feat.quiet.desc')}
              language={language}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-black dark:bg-slate-950 text-[#F2F2EC] dark:text-slate-200 text-center border-t-[6px] border-black dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-5xl sm:text-7xl font-black tracking-tighter mb-10 leading-none">{t('cta.title').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</h2>
          <Link 
            to="/harita" 
            className="inline-flex items-center justify-center px-12 py-6 text-xl font-black tracking-[0.3em] text-black dark:text-white bg-[#FFD700] dark:bg-yellow-600 hover:bg-white dark:hover:bg-yellow-500 hover:scale-105 border-4 border-black transition-all transform shadow-[16px_16px_0_0_#FFF] dark:shadow-[16px_16px_0_0_#422006]"
          >
            {t('cta.button').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}
            <ArrowRight className="ml-4 h-8 w-8" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, language, to }: { icon: React.ReactNode, title: string, description: string, language: string, to: string }) {
  return (
    <Link to={to} className="block p-8 bg-white dark:bg-slate-800 border-4 border-black dark:border-yellow-700 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#422006] hover:-translate-y-2 hover:shadow-[16px_16px_0_0_#000] dark:hover:shadow-[16px_16px_0_0_#422006] transition-all group">
      <div className="w-20 h-20 border-4 border-black dark:border-yellow-600 bg-[#F2F2EC] dark:bg-slate-700 flex items-center justify-center mb-6 group-hover:bg-[#FFD700] dark:group-hover:bg-yellow-500 transition-colors shadow-[4px_4px_0_0_#000]">
        {icon}
      </div>
      <h3 className="text-3xl font-black tracking-tight text-black dark:text-white mb-4 leading-none">{title.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</h3>
      <p className="text-base font-bold text-gray-800 dark:text-slate-300 leading-relaxed">{description}</p>
    </Link>
  );
}

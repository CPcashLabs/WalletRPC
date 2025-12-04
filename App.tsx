
import React, { useState, useEffect, Suspense } from 'react';
import { Search, Download, Trash2, Github, Loader2, Filter } from 'lucide-react';
import { PluginManifest, InstalledPlugin } from './types';
import { MARKETPLACE_MANIFEST, loadPluginComponent } from './pluginRegistry';
import { Sidebar } from './components/Sidebar';
import { DynamicIcon } from './services/iconService';
import { Button } from './components/Button';
import { DeveloperGuide } from './components/DeveloperGuide';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';
import LandingPage from './modules/LandingPage';
import PluginInfo from './modules/PluginInfo';

// Helper component to use translation hook inside Provider
const AppContent = () => {
  const { t } = useTranslation();
  // view can be 'landing', 'workspace', 'marketplace', 'guide', 'plugin-info'
  const [view, setView] = useState<'landing' | 'workspace' | 'marketplace' | 'guide' | 'plugin-info'>('landing');
  
  const [activePluginId, setActivePluginId] = useState<string | null>(null);
  
  // Track which plugin we are viewing details for
  const [viewingPluginId, setViewingPluginId] = useState<string | null>(null);
  
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  // Load installed plugins from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('zerostate_installed_plugins');
    if (saved) {
      try {
        setInstalledPlugins(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load plugins", e);
      }
    }
  }, []);

  // Save installed plugins when changed
  useEffect(() => {
    localStorage.setItem('zerostate_installed_plugins', JSON.stringify(installedPlugins));
  }, [installedPlugins]);

  const handleInstall = (plugin: PluginManifest) => {
    if (installedPlugins.some(p => p.id === plugin.id)) return;
    
    const newPlugin: InstalledPlugin = {
      ...plugin,
      installedAt: Date.now()
    };
    
    setInstalledPlugins([...installedPlugins, newPlugin]);
  };

  const handleUninstall = (pluginId: string) => {
    setInstalledPlugins(installedPlugins.filter(p => p.id !== pluginId));
    if (activePluginId === pluginId) {
      setActivePluginId(null);
    }
  };

  const handlePluginClick = (pluginId: string) => {
    setViewingPluginId(pluginId);
    setView('plugin-info');
  };

  const handleLaunch = (pluginId: string) => {
    setActivePluginId(pluginId);
    setView('workspace');
  };

  // -- Routing Logic --

  if (view === 'landing') {
    return <LandingPage onEnter={() => setView('workspace')} />;
  }

  const ActiveComponent = activePluginId ? loadPluginComponent(activePluginId) : null;
  const viewingPlugin = viewingPluginId ? MARKETPLACE_MANIFEST.find(p => p.id === viewingPluginId) : null;

  // -- Main App Shell --
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 transition-all duration-500 ease-in-out">
      <Sidebar 
        view={view as any}
        installedPlugins={installedPlugins}
        activePluginId={activePluginId}
        onViewChange={(v) => setView(v)}
        onPluginSelect={setActivePluginId}
        onUninstall={handleUninstall}
      />

      <main className="flex-1 transition-all duration-500 ease-in-out md:ml-64 mb-[72px] md:mb-0 h-[calc(100vh-72px)] md:h-screen overflow-y-auto overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          
          {/* --- WORKSPACE VIEW --- */}
          {view === 'workspace' && (
            <div className="animate-in fade-in duration-300">
              {activePluginId && ActiveComponent ? (
                <Suspense fallback={
                  <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                    <p className="animate-pulse">{t('loading')}</p>
                  </div>
                }>
                  <ActiveComponent />
                </Suspense>
              ) : (
                <div className="max-w-4xl mx-auto py-8 md:py-12 text-center">
                  <div className="mb-8 relative inline-block">
                    <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                    <h1 className="relative text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{t('welcome.title')}</h1>
                  </div>
                  <p className="text-base md:text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed px-4">
                    {t('welcome.subtitle')}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-left px-2">
                    <div 
                      onClick={() => setView('marketplace')}
                      className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                    >
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <Download className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{t('card.marketplace.title')}</h3>
                      <p className="text-slate-500 text-sm">{t('card.marketplace.desc')}</p>
                    </div>

                    <div 
                      onClick={() => setView('guide')}
                      className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                    >
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                        <Github className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{t('card.guide.title')}</h3>
                      <p className="text-slate-500 text-sm">{t('card.guide.desc')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- DEVELOPER GUIDE VIEW --- */}
          {view === 'guide' && <DeveloperGuide />}

          {/* --- PLUGIN INFO VIEW --- */}
          {view === 'plugin-info' && viewingPlugin && (
            <PluginInfo 
               plugin={viewingPlugin} 
               isInstalled={installedPlugins.some(p => p.id === viewingPlugin.id)}
               onInstall={() => handleInstall(viewingPlugin)}
               onUninstall={() => handleUninstall(viewingPlugin.id)}
               onLaunch={() => handleLaunch(viewingPlugin.id)}
               onBack={() => setView('marketplace')}
            />
          )}

          {/* --- MARKETPLACE VIEW --- */}
          {view === 'marketplace' && (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header & Search */}
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{t('marketplace.title')}</h1>
                  <p className="text-slate-500 text-sm md:text-base mt-1">{t('marketplace.subtitle')}</p>
                </div>
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={t('search.placeholder')} 
                    className="w-full md:w-72 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              {/* Categories - Swipeable on mobile */}
              <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <div className="flex items-center space-x-2">
                   <Filter className="w-4 h-4 text-slate-400 mr-1 hidden md:block" />
                   {['All', 'Analysis', 'Visualization', 'Utility'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 transform active:scale-95 ${
                        categoryFilter === cat 
                          ? 'bg-slate-900 text-white shadow-md' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {t(`cat.${cat}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
                {MARKETPLACE_MANIFEST
                  .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
                  .map((plugin, idx) => {
                    const isInstalled = installedPlugins.some(p => p.id === plugin.id);
                    
                    return (
                      <div 
                        key={plugin.id} 
                        onClick={() => handlePluginClick(plugin.id)}
                        className="group bg-white rounded-2xl border border-slate-200 p-5 md:p-6 flex flex-col hover:shadow-xl hover:border-indigo-100 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 cursor-pointer relative"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className="p-3 bg-slate-50 rounded-xl mr-4 group-hover:bg-indigo-50 group-hover:scale-110 transition-all duration-300">
                              <DynamicIcon name={plugin.iconName} className="w-6 h-6 text-slate-700 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{plugin.name}</h3>
                              <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                <span className="opacity-75">by {plugin.author}</span>
                              </div>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                            {t(`cat.${plugin.category}`)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-6 flex-grow leading-relaxed">
                          {plugin.description}
                        </p>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                          <div className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">v{plugin.version}</div>
                          {isInstalled ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
                                {t('btn.installed')}
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUninstall(plugin.id); }}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title={t('btn.uninstall')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <Button 
                              onClick={(e) => { e.stopPropagation(); handleInstall(plugin); }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 h-auto shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all transform active:scale-95"
                            >
                              {t('btn.install')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

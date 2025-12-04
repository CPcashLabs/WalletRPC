
import React from 'react';
import { LayoutGrid, Download, Box, Code, Globe, Trash2, Settings, Menu } from 'lucide-react';
import { InstalledPlugin } from '../types';
import { DynamicIcon } from '../services/iconService';
import { useTranslation } from '../contexts/LanguageContext';

interface SidebarProps {
  view: 'workspace' | 'marketplace' | 'guide';
  installedPlugins: InstalledPlugin[];
  activePluginId: string | null;
  onViewChange: (view: 'workspace' | 'marketplace' | 'guide') => void;
  onPluginSelect: (id: string) => void;
  onUninstall?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  view, 
  installedPlugins, 
  activePluginId, 
  onViewChange, 
  onPluginSelect,
  onUninstall
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  // Helper for nav items to keep code clean across responsive modes
  const NavItem = ({ 
    id, 
    icon: Icon, 
    label, 
    isActive, 
    onClick 
  }: { 
    id: string; 
    icon: React.ElementType; 
    label: string; 
    isActive: boolean; 
    onClick: () => void; 
  }) => (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-center md:justify-start px-3 py-2 rounded-xl transition-all duration-300 group
        ${isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 scale-105 md:scale-100' 
          : 'hover:bg-slate-800 text-slate-400 hover:text-white'}
        flex-1 md:flex-none md:w-full
      `}
    >
      <Icon className={`w-5 h-5 md:mr-3 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="text-[10px] md:text-sm font-medium absolute -bottom-1 md:relative md:bottom-auto md:block opacity-0 md:opacity-100 transition-opacity">
        {label}
      </span>
      {/* Mobile Label Pop (optional, mostly relying on icon) */}
      <span className="md:hidden sr-only">{label}</span>
    </button>
  );

  return (
    <>
      {/* 
        Responsive Container 
        - Mobile: Fixed Bottom, h-[72px], w-full, row layout
        - Desktop: Fixed Left, h-screen, w-64, col layout
        - Animation: transition-all on positioning and dimensions
      */}
      <div className={`
        fixed z-50 bg-slate-900/95 backdrop-blur-xl border-slate-800 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        md:top-0 md:left-0 md:h-screen md:w-64 md:flex-col md:border-r md:border-t-0
        bottom-0 left-0 w-full h-[72px] flex flex-row border-t items-center justify-between md:items-stretch
        shadow-[0_-4px_20px_rgba(0,0,0,0.3)] md:shadow-none
      `}>
        
        {/* Header (Desktop Only) */}
        <div className="hidden md:flex p-6 items-center space-x-3 border-b border-slate-800 shrink-0">
          <LayoutGrid className="w-6 h-6 text-indigo-500" />
          <span className="font-bold text-white tracking-tight text-lg">{t('app.title')}</span>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 flex flex-row md:flex-col md:overflow-y-auto md:py-6 md:px-3 justify-around md:justify-start md:space-y-8 px-2">
          
          {/* Main Navigation */}
          <div className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-1 w-full md:w-auto items-center md:items-stretch justify-around">
            <NavItem 
              id="workspace" 
              icon={Box} 
              label={t('nav.workspace')} 
              isActive={view === 'workspace'} 
              onClick={() => { onViewChange('workspace'); onPluginSelect(''); }} 
            />
            <NavItem 
              id="marketplace" 
              icon={Download} 
              label={t('nav.marketplace')} 
              isActive={view === 'marketplace'} 
              onClick={() => onViewChange('marketplace')} 
            />
            <NavItem 
              id="guide" 
              icon={Code} 
              label={t('nav.guide')} 
              isActive={view === 'guide'} 
              onClick={() => onViewChange('guide')} 
            />
            
            {/* Mobile Only: Menu Trigger for extra options */}
            <button 
              className="md:hidden flex items-center justify-center px-3 py-2 text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Installed Apps List (Desktop Only - Vertical List) */}
          <div className="hidden md:block">
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 animate-in fade-in slide-in-from-left-2">
              {t('section.installed')}
            </h3>
            <div className="space-y-1">
              {installedPlugins.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-600 text-center border border-slate-800 border-dashed rounded-lg whitespace-pre-wrap">
                  {t('no.apps')}
                </div>
              ) : (
                installedPlugins.map(plugin => (
                  <div 
                    key={plugin.id}
                    className={`group relative flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                       activePluginId === plugin.id 
                       ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700 translate-x-1' 
                       : 'hover:bg-slate-800 text-slate-400 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <button
                      onClick={() => { onViewChange('workspace'); onPluginSelect(plugin.id); }}
                      className="flex-1 flex items-center min-w-0 text-left"
                    >
                      <DynamicIcon name={plugin.iconName} className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${activePluginId === plugin.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className="truncate">{plugin.name}</span>
                    </button>
                    
                    {onUninstall && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onUninstall(plugin.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded transition-all absolute right-2"
                        title={t('btn.uninstall')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer (Desktop Only) */}
        <div className="hidden md:block p-4 border-t border-slate-800 space-y-3 shrink-0">
          <button 
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-2 py-2 text-xs text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              <span>{language === 'en' ? 'English' : '中文'}</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
               {language === 'en' ? 'ZH' : 'EN'}
            </span>
          </button>

          <div className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-900 group-hover:ring-indigo-500/50 transition-all">
              AU
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{t('user.admin')}</p>
              <p className="text-xs text-slate-500 truncate">{t('user.plan')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer (Pop-up for extra settings) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute bottom-[80px] right-4 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-10 duration-300">
             
             {/* Mobile Language Switch */}
             <button 
                onClick={toggleLanguage}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 rounded-xl mb-2"
              >
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-3 text-indigo-500" />
                  <span>Switch Language</span>
                </div>
                <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded">{language === 'en' ? 'ZH' : 'EN'}</span>
             </button>

             {/* Mobile Installed Apps List (Compact) */}
             <div className="border-t border-slate-800 pt-3 mt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">{t('section.installed')}</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                   {installedPlugins.map(plugin => (
                      <button
                        key={plugin.id}
                        onClick={() => { onViewChange('workspace'); onPluginSelect(plugin.id); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${activePluginId === plugin.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                         <DynamicIcon name={plugin.iconName} className="w-4 h-4 mr-3" />
                         <span className="truncate">{plugin.name}</span>
                      </button>
                   ))}
                   {installedPlugins.length === 0 && <p className="text-xs text-slate-600 px-2 italic">{t('no.apps')}</p>}
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

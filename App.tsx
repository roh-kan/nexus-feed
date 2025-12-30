import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Source, FeedItem, AppState, User } from './types.ts';
import { fetchFeedItems } from './services/feedService.ts';
import { findOrCreateSheet, loadAppStateFromSheet, saveAppStateToSheet } from './services/googleSheetsService.ts';
import SourceManager from './components/SourceManager.tsx';
import FeedItemCard from './components/FeedItemCard.tsx';
import SourceModal from './components/SourceModal.tsx';
import Button from './components/Button.tsx';

// TODO: Replace this with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';

declare global {
  interface Window {
    google: any;
    // Removed redundant aistudio declaration to avoid conflict with platform-provided AIStudio type
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    sources: [],
    items: [],
    readItemIds: [],
    selectedTags: [],
    filterReadStatus: 'all',
    isCloudSyncing: false
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasGeminiKey(selected);
        }
      } catch (e) {
        console.warn("Key check failed or not available", e);
      } finally {
        // Ensure we always stop the loading state
        setIsInitializing(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectApiKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasGeminiKey(true);
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const login = () => {
    if (!window.google) {
      alert("Google Identity Services not loaded. Please check your internet connection.");
      return;
    }

    if (GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
      alert("Please configure your Google Client ID in App.tsx to enable sync.");
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          setIsInitializing(true);
          try {
            const sheetId = await findOrCreateSheet(tokenResponse.access_token);
            const { sources, readItemIds } = await loadAppStateFromSheet(tokenResponse.access_token, sheetId);
            setState(prev => ({
              ...prev,
              user: { accessToken: tokenResponse.access_token, sheetId },
              sources,
              readItemIds
            }));
          } catch (e) {
            console.error("Login/Sheet initialization failed", e);
            alert("Sync failed. Ensure you have enabled the Sheets and Drive APIs.");
          } finally {
            setIsInitializing(false);
          }
        }
      },
    });
    client.requestAccessToken();
  };

  useEffect(() => {
    if (state.user?.accessToken && state.user?.sheetId) {
      const timeout = setTimeout(async () => {
        setState(prev => ({ ...prev, isCloudSyncing: true }));
        try {
          await saveAppStateToSheet(state.user!.accessToken, state.user!.sheetId!, state);
        } catch (e) {
          console.error("Cloud sync failed", e);
        } finally {
          setState(prev => ({ ...prev, isCloudSyncing: false }));
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.sources, state.readItemIds, state.user]);

  const refreshFeeds = useCallback(async () => {
    if (state.sources.length === 0) return;
    setRefreshing(true);
    
    try {
      const allNewItems: FeedItem[] = [];
      const updatedSources = await Promise.all(state.sources.map(async (source) => {
        try {
          const fetchedItems = await fetchFeedItems(source);
          allNewItems.push(...fetchedItems);
          return { ...source, lastFetchStatus: 'success', lastFetchTime: Date.now() } as Source;
        } catch (error) {
          return { ...source, lastFetchStatus: 'error', lastFetchTime: Date.now() } as Source;
        }
      }));

      setState(prev => {
        const mergedItems = allNewItems.map(item => ({
          ...item,
          isRead: prev.readItemIds.includes(item.id)
        }));
        const uniqueItems = Array.from(new Map(mergedItems.map(item => [item.id, item])).values());

        return {
          ...prev,
          sources: updatedSources,
          items: uniqueItems
        };
      });
    } finally {
      setRefreshing(false);
    }
  }, [state.sources, state.readItemIds]);

  useEffect(() => {
    if (state.user && state.sources.length > 0 && state.items.length === 0) {
      refreshFeeds();
    }
  }, [state.user, state.sources.length, state.items.length, refreshFeeds]);

  const handleAddOrEditSource = async (sourceData: Omit<Source, 'id' | 'lastFetchStatus'>) => {
    let updatedSources = [...state.sources];
    if (editingSource) {
      updatedSources = updatedSources.map(s => s.id === editingSource.id ? { ...editingSource, ...sourceData } : s);
    } else {
      updatedSources.push({ ...sourceData, id: crypto.randomUUID(), lastFetchStatus: 'idle' });
    }
    setState(prev => ({ ...prev, sources: updatedSources }));
    setTimeout(() => refreshFeeds(), 100);
  };

  const handleToggleRead = (id: string) => {
    setState(prev => {
      const isRead = prev.readItemIds.includes(id);
      const newReadIds = isRead ? prev.readItemIds.filter(rid => rid !== id) : [...prev.readItemIds, id];
      return {
        ...prev,
        readItemIds: newReadIds,
        items: prev.items.map(item => item.id === id ? { ...item, isRead: !isRead } : item)
      };
    });
  };

  const filteredItems = useMemo(() => {
    return state.items
      .filter(item => {
        const source = state.sources.find(s => s.id === item.sourceId);
        if (!source) return false;
        const matchesTags = state.selectedTags.length === 0 || source.tags.some(tag => state.selectedTags.includes(tag));
        const matchesRead = state.filterReadStatus === 'all' || (state.filterReadStatus === 'read' && item.isRead) || (state.filterReadStatus === 'unread' && !item.isRead);
        return matchesTags && matchesRead;
      })
      .sort((a, b) => b.pubDate - a.pubDate);
  }, [state.items, state.sources, state.selectedTags, state.filterReadStatus]);

  if (isInitializing) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Initializing Nexus Feed...</p>
      </div>
    );
  }

  if (!state.user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="glass w-full max-w-4xl p-8 sm:p-12 rounded-[2.5rem] space-y-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto lg:mx-0 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-900/50">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="space-y-3">
                  <h1 className="text-5xl font-extrabold text-white tracking-tight sm:text-6xl">
                    Nexus <span className="text-blue-500">Feed</span>
                  </h1>
                  <p className="text-xl text-slate-400 font-medium leading-relaxed">
                    The intelligence-first aggregator for your daily content consumption.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 max-w-sm mx-auto lg:mx-0">
                <button 
                  onClick={login}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 px-6 rounded-2xl transition-all shadow-xl active:scale-95 group"
                >
                  <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Connect with Google
                </button>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center">
                  Syncs directly with your Google Sheets
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                </div>
                <h3 className="text-white font-bold mb-1">Unified Feeds</h3>
                <p className="text-sm text-slate-400">Combine RSS and YouTube into a single, beautiful timeline.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-white font-bold mb-1">AI Summaries</h3>
                <p className="text-sm text-slate-400">Get instant AI-generated tl;dr summaries of any article or video.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zM9 12h6M9 16h6M9 8h6" /></svg>
                </div>
                <h3 className="text-white font-bold mb-1">Sheet Sync</h3>
                <p className="text-sm text-slate-400">Your data belongs to you. All settings are saved in your Google Drive.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="text-white font-bold mb-1">Privacy First</h3>
                <p className="text-sm text-slate-400">Serverless architecture. No middlemen. Just you and the sources.</p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div>
              <p className="text-slate-500 text-xs font-medium">Ready to take control of your attention?</p>
            </div>
            <div className="flex gap-4">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Free Forever</span>
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Open Source</span>
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Secure</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <aside className="hidden lg:flex w-72 flex-col bg-slate-900 border-r border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Nexus Feed</h1>
        </div>
        <SourceManager 
          sources={state.sources}
          allTags={Array.from(new Set(state.sources.flatMap(s => s.tags))).sort()}
          selectedTags={state.selectedTags}
          onToggleTag={(tag) => setState(prev => ({ ...prev, selectedTags: prev.selectedTags.includes(tag) ? prev.selectedTags.filter(t => t !== tag) : [...prev.selectedTags, tag] }))}
          onEditSource={(s) => { setEditingSource(s); setIsModalOpen(true); }}
          onDeleteSource={(id) => setState(prev => ({ ...prev, sources: prev.sources.filter(s => s.id !== id) }))}
          onAddSource={() => { setEditingSource(null); setIsModalOpen(true); }}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
               <button onClick={() => setState(prev => ({...prev, filterReadStatus: 'all'}))} className={`px-3 py-1 text-xs font-semibold rounded-lg ${state.filterReadStatus === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>All</button>
               <button onClick={() => setState(prev => ({...prev, filterReadStatus: 'unread'}))} className={`px-3 py-1 text-xs font-semibold rounded-lg ${state.filterReadStatus === 'unread' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Unread</button>
            </div>
            {state.isCloudSyncing && (
              <span className="flex items-center gap-2 text-[10px] text-blue-400 font-bold uppercase tracking-widest animate-pulse">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                Cloud Saving...
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={refreshFeeds} isLoading={refreshing}>Refresh</Button>
            
            <button 
              onClick={handleSelectApiKey}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${hasGeminiKey ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
            >
              <div className={`w-2 h-2 rounded-full ${hasGeminiKey ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-500'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{hasGeminiKey ? 'AI Active' : 'Setup AI'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredItems.map(item => <FeedItemCard key={item.id} item={item} onToggleRead={handleToggleRead} />)}
            {filteredItems.length === 0 && (
              <div className="text-center py-20">
                <p className="text-slate-600">Your feed is quiet. Add some sources to get started!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {isModalOpen && <SourceModal source={editingSource} onClose={() => setIsModalOpen(false)} onSave={handleAddOrEditSource} />}
    </div>
  );
};

export default App;
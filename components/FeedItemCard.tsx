
import React, { useState } from 'react';
import { FeedItem } from '../types';
import { summarizeContent } from '../services/geminiService';
import Button from './Button';

interface FeedItemCardProps {
  item: FeedItem;
  onToggleRead: (id: string) => void;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, onToggleRead }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const formattedDate = new Date(item.pubDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleSummarize = async () => {
    // Check if key exists
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      if (confirm("AI summarization requires a Gemini API key. Would you like to set one up now?")) {
        await window.aistudio.openSelectKey();
        return;
      }
      return;
    }

    setIsSummarizing(true);
    try {
      const result = await summarizeContent(item.title, item.description || "");
      setSummary(result);
    } catch (e) {
      console.error("Summary failed", e);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className={`group relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-800 transition-all duration-300 ${item.isRead ? 'bg-slate-900/50 opacity-60' : 'bg-slate-900 hover:bg-slate-800/80 hover:border-slate-700'}`}>
      {item.thumbnail && (
        <div className="flex-shrink-0 w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-slate-800">
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
            {item.sourceName}
          </span>
          <span className="text-xs text-slate-500 shrink-0">{formattedDate}</span>
        </div>
        
        <h3 className="text-lg font-semibold text-slate-100 mb-2 leading-tight line-clamp-2">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            {item.title}
          </a>
        </h3>

        {summary ? (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">AI Summary</span>
             </div>
             <p className="text-sm text-slate-200 leading-relaxed italic">"{summary}"</p>
          </div>
        ) : (
          item.description && (
            <p className="text-sm text-slate-400 line-clamp-2 mb-3" dangerouslySetInnerHTML={{ __html: item.description.replace(/<[^>]*>?/gm, '') }} />
          )
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          <button 
            onClick={() => onToggleRead(item.id)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${item.isRead ? 'text-slate-500 hover:text-slate-300' : 'text-blue-500 hover:text-blue-400'}`}
          >
            {item.isRead ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Mark as Unread
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Mark as Read
              </>
            )}
          </button>

          {!summary && (
            <button 
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-400 transition-all disabled:opacity-50"
            >
              {isSummarizing ? (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              Summarize
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedItemCard;

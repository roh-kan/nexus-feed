import React, { useState } from 'react';
import { FeedItem } from '../types.ts';
import { summarizeContent } from '../services/geminiService.ts';
import Button from './Button.tsx';

interface FeedItemCardProps {
  item: FeedItem;
  onToggleRead: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({
  item,
  onToggleRead,
  onToggleStar,
  onDelete
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const formattedDate = new Date(item.pubDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleSummarize = async () => {
    // API Key management is handled externally for basic text models
    setIsSummarizing(true);
    try {
      const result = await summarizeContent(item.title, item.description || '');
      setSummary(result);
    } catch (e) {
      console.error('Summary failed', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div
      className={`group relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-800 transition-all duration-300 ${
        item.isRead
          ? 'bg-slate-900/50 opacity-60'
          : 'bg-slate-900 hover:bg-slate-800/80 hover:border-slate-700'
      }`}
    >
      {item.thumbnail && (
        <div className="flex-shrink-0 w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-slate-800">
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
            {item.sourceName}
          </span>
          <span className="text-xs text-slate-500 shrink-0">
            {formattedDate}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-slate-100 mb-2 leading-tight line-clamp-2">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-colors"
          >
            {item.title}
          </a>
        </h3>

        {summary ? (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                AI Summary
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed italic">
              "{summary}"
            </p>
          </div>
        ) : (
          item.description && (
            <p
              className="text-sm text-slate-400 line-clamp-2 mb-3"
              dangerouslySetInnerHTML={{
                __html: item.description.replace(/<[^>]*>?/gm, '')
              }}
            />
          )
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          <button
            onClick={() => onToggleRead(item.id)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              item.isRead
                ? 'text-slate-500 hover:text-slate-300'
                : 'text-blue-500 hover:text-blue-400'
            }`}
          >
            {item.isRead ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
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
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              )}
              Summarize
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStar && onToggleStar(item.id)}
              className={`p-2 rounded-md transition-colors ${
                item.isStarred
                  ? 'text-yellow-400 hover:text-yellow-300'
                  : 'text-slate-500 hover:text-yellow-400'
              }`}
              title={item.isStarred ? 'Unstar' : 'Star'}
            >
              {item.isStarred ? (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.596 0 9.748l8.332-1.73z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118L12 15.347l-3.37 2.447c-.784.57-1.838-.197-1.539-1.118l1.286-3.955a1 1 0 00-.364-1.118L4.642 9.382c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.955z"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={() => onDelete && onDelete(item.id)}
              className="p-2 rounded-md text-slate-500 hover:text-red-400"
              title="Delete"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedItemCard;


import React from 'react';
import { Source } from '../types';
import Button from './Button';

interface SourceManagerProps {
  sources: Source[];
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onEditSource: (source: Source) => void;
  onDeleteSource: (id: string) => void;
  onAddSource: () => void;
}

const SourceManager: React.FC<SourceManagerProps> = ({
  sources,
  allTags,
  selectedTags,
  onToggleTag,
  onEditSource,
  onDeleteSource,
  onAddSource
}) => {
  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sources</h2>
          <Button size="sm" variant="ghost" onClick={onAddSource}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Add
          </Button>
        </div>
        
        <div className="space-y-1">
          {sources.length === 0 ? (
            <p className="text-sm text-slate-600 italic px-2">No sources added yet.</p>
          ) : (
            sources.map(source => (
              <div key={source.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{source.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {source.tags.slice(0, 2).map(t => (
                      <span key={t} className="text-[10px] text-slate-500 truncate max-w-[60px]">#{t}</span>
                    ))}
                    {source.tags.length > 2 && <span className="text-[10px] text-slate-500">...</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEditSource(source)} className="p-1 text-slate-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => onDeleteSource(source.id)} className="p-1 text-slate-400 hover:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Filters</h2>
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTags.includes(tag)
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {allTags.length === 0 && (
            <p className="text-sm text-slate-600 italic">No tags yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourceManager;

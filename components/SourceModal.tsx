import React, { useState, useEffect } from 'react';
import { Source, SourceType } from '../types.ts';
import Input from './Input.tsx';
import Button from './Button.tsx';
import { suggestTags } from '../services/geminiService.ts';
import { extractYoutubeChannelId } from '../services/feedService.ts';

interface SourceModalProps {
  source?: Source | null;
  onClose: () => void;
  onSave: (sourceData: Omit<Source, 'id' | 'lastFetchStatus'>) => Promise<void>;
}

const SourceModal: React.FC<SourceModalProps> = ({
  source,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<SourceType>('rss');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (source) {
      setName(source.name);
      setUrl(source.url);
      setType(source.type);
      setTagsInput(source.tags.join(', '));
    }
  }, [source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let finalUrl = url.trim();
      if (type === 'youtube') {
        const channelId = extractYoutubeChannelId(finalUrl);
        if (!channelId) {
          throw new Error(
            'Invalid YouTube channel URL. Please use the full channel URL or @username.'
          );
        }
        finalUrl = channelId;
      }

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t !== '');

      await onSave({
        name: name.trim() || 'New Source',
        url: finalUrl,
        type,
        tags
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTags = async () => {
    setLoading(true);
    setError('');
    try {
      const suggestions = await suggestTags(name || '', url || '');
      if (suggestions && suggestions.length > 0) {
        setTagsInput(suggestions.join(', '));
      } else {
        setError('No tag suggestions returned.');
      }
    } catch (err: any) {
      setError(err.message || 'Tag suggestion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-white mb-6">
          {source ? 'Edit Source' : 'Add New Source'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Custom Name"
            placeholder="e.g. Tech News"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Source Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('rss')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  type === 'rss'
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                RSS Feed
              </button>
              <button
                type="button"
                onClick={() => setType('youtube')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  type === 'youtube'
                    ? 'bg-red-600/10 border-red-500 text-red-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                YouTube
              </button>
            </div>
          </div>

          <Input
            label={type === 'youtube' ? 'YouTube Channel URL' : 'RSS Feed URL'}
            placeholder={
              type === 'youtube'
                ? 'https://youtube.com/@channel'
                : 'https://example.com/feed.xml'
            }
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <Input
            label="Tags (comma-separated)"
            placeholder="news, tech, podcast"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleSuggestTags}
              isLoading={loading}
            >
              AI Suggest Tags
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={loading}
            >
              {source ? 'Save Changes' : 'Add Source'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SourceModal;

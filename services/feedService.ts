
import { Source, FeedItem } from '../types';

const PROXY_URL = 'https://api.rss2json.com/v1/api.json?rss_url=';

export async function fetchFeedItems(source: Source): Promise<FeedItem[]> {
  try {
    const targetUrl = source.type === 'youtube' 
      ? `https://www.youtube.com/feeds/videos.xml?channel_id=${source.url}`
      : source.url;

    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Failed to fetch feed');
    
    const data = await response.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Error parsing feed');

    // Take only last 3 items as per spec
    const items = data.items.slice(0, 3).map((item: any) => ({
      id: item.guid || item.link,
      sourceId: source.id,
      sourceName: source.name,
      title: item.title,
      link: item.link,
      pubDate: new Date(item.pubDate).getTime(),
      thumbnail: item.thumbnail || (source.type === 'youtube' ? item.enclosure?.link : undefined),
      description: item.description,
      isRead: false
    }));

    return items;
  } catch (error) {
    console.error(`Error fetching source ${source.name}:`, error);
    throw error;
  }
}

export function extractYoutubeChannelId(url: string): string | null {
  // Simple check for common youtube channel URL patterns
  const patterns = [
    /youtube\.com\/channel\/([^/?#]+)/,
    /youtube\.com\/c\/([^/?#]+)/,
    /youtube\.com\/user\/([^/?#]+)/,
    /youtube\.com\/@([^/?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

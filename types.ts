
export type SourceType = 'rss' | 'youtube';

export interface User {
  accessToken: string;
  name?: string;
  picture?: string;
  sheetId?: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  tags: string[];
  lastFetchStatus: 'success' | 'error' | 'idle';
  lastFetchTime?: number;
}

export interface FeedItem {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  pubDate: number;
  thumbnail?: string;
  description?: string;
  isRead: boolean;
  isStarred?: boolean;
}

export interface AppState {
  user: User | null;
  sources: Source[];
  items: FeedItem[];
  readItemIds: string[]; // Track IDs persistently for Sheets
  deletedItemIds?: string[];
  selectedTags: string[];
  filterReadStatus: 'all' | 'unread' | 'read' | 'starred';
  isCloudSyncing: boolean;
}

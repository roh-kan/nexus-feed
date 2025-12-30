
import { AppState, Source } from '../types.ts';

const SHEET_NAME = 'NexusFeed_Data';

export async function findOrCreateSheet(token: string): Promise<string> {
  // 1. Search for existing sheet
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Create new sheet if not found
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: SHEET_NAME },
      sheets: [
        { properties: { title: 'Sources' } },
        { properties: { title: 'ReadHistory' } }
      ]
    })
  });
  const newData = await createRes.json();
  
  // Initialize headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newData.spreadsheetId}/values/Sources!A1:E1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [['id', 'name', 'url', 'type', 'tags']] })
  });

  return newData.spreadsheetId;
}

export async function saveAppStateToSheet(token: string, sheetId: string, state: AppState) {
  // Save Sources
  const sourceValues = state.sources.map(s => [s.id, s.name, s.url, s.type, s.tags.join(',')]);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sources!A2:E${sourceValues.length + 1}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: sourceValues })
  });

  // Save Read Status
  const readValues = state.readItemIds.map(id => [id]);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/ReadHistory!A1:A${readValues.length}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: readValues })
  });
}

export async function loadAppStateFromSheet(token: string, sheetId: string): Promise<{ sources: Source[], readItemIds: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=Sources!A2:E100&ranges=ReadHistory!A1:A10000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  const sourcesRows = data.valueRanges[0].values || [];
  const readRows = data.valueRanges[1].values || [];

  const sources: Source[] = sourcesRows.map((row: any) => ({
    id: row[0],
    name: row[1],
    url: row[2],
    type: row[3],
    tags: row[4] ? row[4].split(',') : [],
    lastFetchStatus: 'idle'
  }));

  const readItemIds: string[] = readRows.map((row: any) => row[0]);

  return { sources, readItemIds };
}

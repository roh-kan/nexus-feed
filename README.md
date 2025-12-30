# Nexus Feed

A high-performance, AI-powered content aggregator for RSS and YouTube feeds, using Google Sheets as a serverless database.

## 🚀 Deployment to GitHub Pages

This app is designed to run without a build step using native Browser ESM and Import Maps.

### 1. Google Cloud Configuration
To enable Google Login and Sheets Sync:
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Sheets API** and **Google Drive API**.
3. Create **OAuth 2.0 Credentials** (Web Application).
4. Add your deployment URL to **Authorized JavaScript Origins**:
   - `http://localhost` (for local testing)
   - `https://[your-username].github.io` (for production)
5. Copy the **Client ID** and paste it into `App.tsx` (the `GOOGLE_CLIENT_ID` constant).

### 2. Gemini AI Setup
Summarization features require a Gemini API Key:
1. The app will prompt you to "Setup AI" on first use.
2. It uses the `window.aistudio` interface to securely manage your key.
3. Your key is stored in your own browser and never sent to a central server.

### 3. Usage
- **Add Source**: Click the '+' or 'Add' button to link an RSS feed or YouTube channel.
- **Sync**: Log in with Google to create/connect a "NexusFeed_Data" spreadsheet in your Google Drive.
- **Summarize**: Click 'Summarize' on any feed item to get a 15-word AI tl;dr.

## 🛠️ Tech Stack
- **Framework**: React (v19)
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API
- **Storage**: Google Sheets API (Serverless)
- **Module Management**: Native Browser Import Maps via [esm.sh](https://esm.sh)

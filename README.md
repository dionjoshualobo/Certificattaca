# Certificattaca

Simple certificate generator UI built with React, Vite, and TypeScript.

## Working Locally

Requirements:

- Node.js 20+ recommended
- npm

Install dependencies:

```bash
npm install
```

Optional, for Google Drive export:

```bash
cp .env.example .env
```

Fill these values in `.env` only if you want Drive upload support:

```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-google-api-key
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:8080.

## Working With Docker

Docker builds the static Vite app and serves it on port `3000`.

```bash
docker compose up --build
```

Open http://localhost:3000.

If Google Drive export is enabled, Docker Compose reads `.env` and passes the `VITE_` values as build args. Vite embeds these values during `npm run build`, so rebuild the image whenever you change them:

```bash
docker compose up --build
```

## Basic Usage

1. Upload a certificate template image.
2. Upload a dataset.
3. Add text boxes on the certificate.
4. Map dataset columns to text boxes.
5. Choose an export option:
   - `Local, Zip`: downloads a ZIP file of PNG certificates.
   - `GDrive, Folder`: uploads PNG certificates to a chosen Drive folder.
   - `GDrive, Zip`: uploads one ZIP file to a chosen Drive folder.

For Drive folder exports, you can choose a destination folder, use My Drive root, create a folder inside the selected destination, and optionally create a final certificate folder. If the certificate folder name is blank, images are uploaded directly into the selected destination.

For Drive ZIP exports, you can choose a destination folder and set the ZIP file name. The `.zip` extension is added automatically if needed.

## Production Setup

Build locally:

```bash
npm run build
npm run preview
```

Build with Docker:

```bash
docker compose up --build
```

This app is static. There is no backend server storing files or tokens. Google access tokens are stored in `sessionStorage`, so they survive reloads but not closing the tab.

## Google Drive Keys

Drive export needs two browser-side Google values:

- `VITE_GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID for a Web application.
- `VITE_GOOGLE_API_KEY`: API key used by Google Picker.

No Google client secret is used in this app. Browser apps cannot keep client secrets private.

The app requests this OAuth scope:

```text
https://www.googleapis.com/auth/drive.file
```

### Create the Google Cloud Setup

Use the Google Cloud Console and official docs:

- Google Picker setup: https://developers.google.com/workspace/drive/picker/guides/overview
- Drive API: https://developers.google.com/drive/api/guides/about-sdk
- OAuth 2.0 for browser apps: https://developers.google.com/identity/oauth2/web/guides/overview
- API key restrictions: https://cloud.google.com/docs/authentication/api-keys

Steps:

1. Create or choose a Google Cloud project.
2. Enable **Google Drive API**.
3. Enable **Google Picker API**.
4. Configure the Google Auth consent screen.
5. Create an OAuth Client ID:
   - Application type: `Web application`
   - Authorized JavaScript origins for local dev: `http://localhost:8080`
   - Authorized JavaScript origins for Docker local: `http://localhost:3000`
   - Authorized JavaScript origins for production: your deployed origin, for example `https://example.com`
   - Redirect URIs are not needed for this popup token flow.
6. Create an API key:
   - Restrict it to HTTP referrers such as `http://localhost:8080/*`, `http://localhost:3000/*`, and `https://example.com/*`.
   - Restrict allowed APIs to Google Picker API where available.
7. Copy the values into `.env`:

```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-google-api-key
```

If the OAuth app is in testing mode, add test users in Google Cloud. For public production use, publish the OAuth app and complete any Google verification steps requested by the console.

## Key Files

- `src/components/WorkspaceCanvas.tsx`: main canvas, mappings, certificate generation, and export flow.
- `src/lib/googleDrive.ts`: Google Identity, Picker, folder creation, and Drive uploads.
- `src/components/DraggableBox.tsx`: draggable text boxes and target dot.
- `src/components/CertificatePreview.tsx`: sample output preview.
- `src/components/DatasetPreview.tsx`: dataset table and column drag source.

## Troubleshooting

- If Drive Picker does not open, check that both Google APIs are enabled and the current origin is listed in the OAuth Client ID.
- If Drive upload fails after the picker works, check the browser console for the Drive API error and confirm the OAuth consent screen allows the app user.
- If generated text looks wrong, confirm the font loaded before exporting.
- If arrows or dots are misaligned after resizing, wait for the template image to finish loading and refresh if needed.

## License

MIT

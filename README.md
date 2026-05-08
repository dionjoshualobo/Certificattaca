# Certificattaca

Simple certificate generator UI (React + Vite + TypeScript).

## Quick start

### Option 1: Using Docker (Easiest for sharing)

```bash
docker compose up --build
```

Open http://localhost:3000 — no dependencies needed, works on any machine with Docker installed.

### Option 2: Local development

Requirements: Node.js (16+) and npm.

```bash
npm install
npm run dev
```

Open http://localhost:5173 — Vite will hot-reload changes in `src/`.

## Basic usage

- Add text boxes using the `Add Text Box` button.
- Upload a custom font or choose a default font from the font selector.
- Map columns from the dataset preview to boxes by dragging or dropping.
- Once you have at least one mapping, open the `Output Preview` panel and click `Show Preview` to render a sample using the first row.
- Click the preview to maximize it. When ready, click `Generate Certificates` to download a ZIP of generated PNGs.

## Google Drive export (optional)

This app can upload to Google Drive directly from the browser (no server storage). Users only need to approve access; the app owner sets this up once.

### One-time app owner setup

1. Create a Google Cloud project.
2. Enable **Google Drive API**.
3. Create an **OAuth Client ID** (Web application).
4. Add your dev/production origins to **Authorized JavaScript origins**.
5. Set the client ID in `.env`:

```bash
VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
```

### What users do

- Click the Drive option.
- Grant permission in the Google popup.
- Uploads go straight to their Drive.

Tokens are stored in `sessionStorage`, so they survive reloads but not closing the tab.

## Key files

- `src/components/WorkspaceCanvas.tsx` — main canvas: renders template image, boxes, arrows and mapping logic.
- `src/components/DraggableBox.tsx` — draggable boxes and the red target dot.
- `src/components/CertificatePreview.tsx` — generates the sample output image and preview dialog.
- `src/components/DatasetPreview.tsx` — dataset table and column drag source.

## Troubleshooting

- If preview doesn't appear, open the browser console (F12 → Console) and look for preview logs/errors.
- If arrows or dots are misaligned after editing boxes, ensure the template image has finished loading; `WorkspaceCanvas` uses a `scale` value based on the image's displayed width.

## Build for production

```bash
npm run build
npm run preview
```

## License

MIT (update as needed).

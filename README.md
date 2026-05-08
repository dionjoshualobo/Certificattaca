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
- Map columns from the dataset preview to boxes by dragging or dropping.
- Once you have at least one mapping, open the `Output Preview` panel and click `Show Preview` to render a sample using the first row.
- Click the preview to maximize it. When ready, click `Generate Certificates` to download a ZIP of generated PNGs.

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

/// <reference types="vitest/config" />
import { createReadStream } from 'node:fs';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

const rootDir = __dirname;
const assetInboxDir = resolve(rootDir, 'asset-inbox');
const candidateDir = resolve(assetInboxDir, 'candidates');
const manifestPath = resolve(assetInboxDir, 'manifests/source-assets.json');

const MIME_TYPES: Record<string, string> = {
  '.bin': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
};

function getExtension(filePath: string): string {
  const dot = filePath.lastIndexOf('.');
  return dot === -1 ? '' : filePath.slice(dot).toLowerCase();
}

async function listCandidateFiles(
  dir: string,
  base = candidateDir,
): Promise<{ path: string; category: string; type: string }[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    return [];
  }

  const files: { path: string; category: string; type: string }[] = [];
  for (const entry of entries) {
    const entryName = String(entry.name);
    const fullPath = resolve(dir, entryName);
    if (entry.isDirectory()) {
      files.push(...(await listCandidateFiles(fullPath, base)));
      continue;
    }

    if (!entry.isFile() && !entry.isSymbolicLink()) continue;

    const relativePath = fullPath
      .slice(base.length + 1)
      .split('/')
      .join('/');
    const [category = 'uncategorized'] = relativePath.split('/');
    const ext = getExtension(relativePath);
    const type =
      ext === '.glb' || ext === '.gltf'
        ? 'model'
        : ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
          ? 'image'
          : ['.flac', '.m4a', '.mp3', '.ogg', '.wav'].includes(ext)
            ? 'audio'
            : 'data';
    files.push({ path: `candidates/${relativePath}`, category, type });
  }
  return files;
}

async function sendAssetFile(res: ServerResponse, relativePath: string): Promise<void> {
  const requested = resolve(assetInboxDir, relativePath);
  const [safeRoot, safeRequested] = await Promise.all([realpath(assetInboxDir), realpath(requested)]);
  if (!safeRequested.startsWith(safeRoot)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const fileStat = await stat(safeRequested);
  if (!fileStat.isFile()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  res.setHeader('Content-Type', MIME_TYPES[getExtension(safeRequested)] ?? 'application/octet-stream');
  res.setHeader('Content-Length', String(fileStat.size));
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(safeRequested).pipe(res);
}

function assetLabPlugin(): Plugin {
  return {
    name: 'neuroflight-asset-lab',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        try {
          if (url === '/asset-lab/manifest.json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(await readFile(manifestPath, 'utf8'));
            return;
          }

          if (url === '/asset-lab/index.json') {
            const files = await listCandidateFiles(candidateDir);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({ generatedAt: new Date().toISOString(), files }));
            return;
          }

          if (url.startsWith('/asset-lab/files/')) {
            await sendAssetFile(res, decodeURIComponent(url.slice('/asset-lab/files/'.length)));
            return;
          }
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : 'Asset lab error');
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), tailwindcss(), process.env.NODE_ENV !== 'production' && assetLabPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: process.env.GITHUB_PAGES ? '/neuroflight/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/three/')) return 'vendor-three';
          if (id.includes('/tone/')) return 'vendor-tone';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router/')) {
            return 'vendor-react';
          }
          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@elata-biosciences/eeg-web', '@elata-biosciences/eeg-web-ble', '@elata-biosciences/rppg-web'],
  },
  server: {
    port: 3010,
    open: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
  },
});

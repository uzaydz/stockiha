#!/usr/bin/env node

/**
 * Build-time responsive images generator for external (Unsplash) images.
 * - Scans source files for images.unsplash.com URLs
 * - Downloads originals once, generates multiple sizes (webp+avif)
 * - Emits files to public/images/responsive and a manifest.json
 *
 * Safe for Supabase Free Plan (no on-the-fly transforms, static only).
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import crypto from 'crypto';
import sharp from 'sharp';
import fetch from 'node-fetch';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'images', 'responsive');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const WIDTHS = [160, 320, 480, 720, 960];

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeUnsplashUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('images.unsplash.com')) return null;
    // strip sizing/query so we dedupe the same asset referenced with different params
    return `https://images.unsplash.com${u.pathname}`;
  } catch {
    return null;
  }
}

function sha1Hex(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

async function downloadUnsplash(url) {
  // fetch a sufficiently large base (1600px wide) to downscale from
  const base = new URL(url);
  base.searchParams.set('w', '1600');
  base.searchParams.set('q', '85');
  base.searchParams.set('auto', 'format');
  base.searchParams.set('fit', 'crop');

  const res = await fetch(base.toString());
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${base}`);
  const buf = await res.buffer();
  return buf;
}

async function processOne(url, manifest) {
  const key = normalizeUnsplashUrl(url);
  if (!key) return;
  if (manifest[key]) return; // already processed

  const id = sha1Hex(key).slice(0, 12);
  console.log(`↻ Processing ${key} -> ${id}`);

  try {
    const original = await downloadUnsplash(key);
    const image = sharp(original);
    const meta = await image.metadata();

    const formats = { webp: [], avif: [] };

    for (const w of WIDTHS) {
      const pipeline = image.clone().resize({ width: w, withoutEnlargement: true });

      const webpName = `${id}-${w}.webp`;
      const webpPath = path.join(OUT_DIR, webpName);
      const webpBuf = await pipeline.webp({ quality: 78, effort: 5 }).toBuffer();
      fs.writeFileSync(webpPath, webpBuf);
      formats.webp.push({ w, path: `/images/responsive/${webpName}` });

      const avifName = `${id}-${w}.avif`;
      const avifPath = path.join(OUT_DIR, avifName);
      const avifBuf = await pipeline.avif({ quality: 45, effort: 4 }).toBuffer();
      fs.writeFileSync(avifPath, avifBuf);
      formats.avif.push({ w, path: `/images/responsive/${avifName}` });
    }

    manifest[key] = {
      id,
      sourceMeta: { width: meta.width, height: meta.height, format: meta.format },
      formats,
    };
  } catch (e) {
    console.warn(`⚠️ Failed to process ${key}:`, e.message);
  }
}

async function main() {
  ensureDirSync(OUT_DIR);
  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch {}
  }

  // scan source files for Unsplash references
  const files = await glob('src/**/*.{ts,tsx,js,jsx,md,json}', { ignore: ['**/node_modules/**', '**/dist/**'] });
  const found = new Set();
  const urlRe = /https?:\/\/images\.unsplash\.com[^'"\)\s]*/g;

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const matches = content.match(urlRe);
    if (matches) matches.forEach(u => found.add(u));
  }

  const unique = Array.from(found);
  console.log(`Found ${unique.length} Unsplash URLs`);

  for (const url of unique) {
    await processOne(url, manifest);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`✅ Wrote manifest: ${MANIFEST_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


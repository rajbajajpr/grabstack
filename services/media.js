// services/media.js
// Reads the device Screenshots album using expo-media-library.
// Images are NEVER copied or uploaded — only referenced by localIdentifier.

import * as MediaLibrary from 'expo-media-library';
import { upsertScreenshot, getScreenshotCount, setSetting, getSetting } from './database';

const FREE_LIMIT = 100;

// ── PERMISSIONS ──────────────────────────────────────────────────────────────

export async function requestPermission() {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkPermission() {
  const { status } = await MediaLibrary.getPermissionsAsync();
  return status === 'granted';
}

// ── SCAN ─────────────────────────────────────────────────────────────────────

/**
 * Scans the Screenshots album and saves references to the local database.
 * Calls onProgress({ loaded, total }) during scan.
 * Returns { imported, total, hitLimit }
 */
export async function scanScreenshots({ isPremium = false, onProgress } = {}) {
  const hasPermission = await checkPermission();
  if (!hasPermission) {
    const granted = await requestPermission();
    if (!granted) return { imported: 0, total: 0, hitLimit: false, error: 'permission_denied' };
  }

  // Find the Screenshots album
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  const screenshotsAlbum = albums.find(a =>
    a.title === 'Screenshots' ||
    a.title === 'Screenshot' ||
    a.assetCount > 0 && a.title.toLowerCase().includes('screenshot')
  );

  let assets = [];

  if (screenshotsAlbum) {
    // Fetch all assets from Screenshots album
    let after = undefined;
    let hasMore = true;
    while (hasMore) {
      const page = await MediaLibrary.getAssetsAsync({
        album: screenshotsAlbum,
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
        first: 200,
        after,
      });
      assets = assets.concat(page.assets);
      hasMore = page.hasNextPage;
      after = page.endCursor;
    }
  } else {
    // Fallback: get recent photos and filter by filename
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      sortBy: [['creationTime', false]],
      first: 500,
    });
    assets = page.assets.filter(a =>
      a.filename?.toLowerCase().includes('screenshot') ||
      a.filename?.toLowerCase().includes('screen_shot') ||
      a.filename?.match(/^img_\d+/i)
    );
  }

  const total = assets.length;
  const limit = isPremium ? Infinity : FREE_LIMIT;
  const toImport = assets.slice(0, limit);
  const hitLimit = !isPremium && total > FREE_LIMIT;

  let loaded = 0;
  for (const asset of toImport) {
    const id = 'ss-' + asset.id;
    await upsertScreenshot({
      id,
      localIdentifier: asset.id,
      capturedAt: Math.floor(asset.creationTime),
      filename: asset.filename,
    });
    loaded++;
    if (onProgress) onProgress({ loaded, total: toImport.length });
  }

  await setSetting('lastScanAt', String(Date.now()));
  await setSetting('totalOnDevice', String(total));

  return { imported: loaded, total, hitLimit };
}

// ── ASSET URI ─────────────────────────────────────────────────────────────────

/**
 * Get the local URI for a screenshot to display in an Image component.
 * Uses the localIdentifier stored in the database.
 */
export async function getAssetUri(localIdentifier) {
  try {
    const asset = await MediaLibrary.getAssetInfoAsync(localIdentifier);
    return asset?.localUri || asset?.uri || null;
  } catch {
    return null;
  }
}

/**
 * Get a batch of asset URIs. More efficient than calling getAssetUri individually.
 * Returns a map of { localIdentifier: uri }
 */
export async function getAssetUris(localIdentifiers) {
  const result = {};
  await Promise.all(
    localIdentifiers.map(async (id) => {
      result[id] = await getAssetUri(id);
    })
  );
  return result;
}

// ── TOTALS ───────────────────────────────────────────────────────────────────

export async function getTotalOnDevice() {
  const val = await getSetting('totalOnDevice');
  return val ? parseInt(val) : 0;
}

export { FREE_LIMIT };

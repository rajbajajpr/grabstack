// services/shotCache.js
// Simple in-memory store to pass screenshot data between screens
// Avoids URI encoding issues with router params

const cache = new Map();

export function storeShot(shot) {
  cache.set(shot.id, shot);
}

export function getShot(id) {
  return cache.get(id) || null;
}

export function clearOld() {
  if (cache.size > 200) cache.clear();
}

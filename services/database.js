// services/database.js
// All local SQLite operations. GrabStack never sends data to a server.

import * as SQLite from 'expo-sqlite';

let db;

// ── INITIALISE ──────────────────────────────────────────────────────────────

export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('grabstack.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS screenshots (
      id              TEXT PRIMARY KEY,
      localIdentifier TEXT NOT NULL UNIQUE,
      capturedAt      INTEGER NOT NULL,
      filename        TEXT,
      aiCategory      TEXT,
      aiConfidence    REAL,
      userLabel       TEXT,
      inWantList      INTEGER DEFAULT 0,
      isDeleted       INTEGER DEFAULT 0,
      createdAt       INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS stacks (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      emoji         TEXT DEFAULT '📁',
      isSystem      INTEGER DEFAULT 0,
      isAiSuggested INTEGER DEFAULT 0,
      isShared      INTEGER DEFAULT 0,
      shareSlug     TEXT,
      sortOrder     INTEGER DEFAULT 0,
      createdAt     INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS stack_items (
      id            TEXT PRIMARY KEY,
      stackId       TEXT NOT NULL,
      screenshotId  TEXT NOT NULL,
      position      INTEGER DEFAULT 0,
      addedBy       TEXT DEFAULT 'user',
      addedAt       INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (stackId)      REFERENCES stacks(id)      ON DELETE CASCADE,
      FOREIGN KEY (screenshotId) REFERENCES screenshots(id) ON DELETE CASCADE,
      UNIQUE(stackId, screenshotId)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_screenshots_captured ON screenshots(capturedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_stack_items_stack    ON stack_items(stackId);
    CREATE INDEX IF NOT EXISTS idx_stack_items_shot     ON stack_items(screenshotId);
  `);

  // Seed default system stacks if not present
  const existing = await db.getFirstAsync(`SELECT id FROM stacks WHERE isSystem = 1 AND id = 'want-list'`);
  if (!existing) {
    await db.runAsync(
      `INSERT INTO stacks (id, name, emoji, isSystem, sortOrder) VALUES (?, ?, ?, 1, 0)`,
      ['want-list', 'Want list', '❤️']
    );
  }

  return db;
}

// ── SETTINGS ────────────────────────────────────────────────────────────────

export async function getSetting(key) {
  const row = await db.getFirstAsync(`SELECT value FROM user_settings WHERE key = ?`, [key]);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  await db.runAsync(
    `INSERT INTO user_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)]
  );
}

// ── SCREENSHOTS ─────────────────────────────────────────────────────────────

export async function upsertScreenshot(shot) {
  await db.runAsync(
    `INSERT INTO screenshots (id, localIdentifier, capturedAt, filename, aiCategory, aiConfidence)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(localIdentifier) DO UPDATE SET
       capturedAt = excluded.capturedAt,
       filename   = excluded.filename`,
    [
      shot.id,
      shot.localIdentifier,
      shot.capturedAt,
      shot.filename || null,
      shot.aiCategory || null,
      shot.aiConfidence || null,
    ]
  );
}

export async function getAllScreenshots({ limit = 100, offset = 0 } = {}) {
  return db.getAllAsync(
    `SELECT * FROM screenshots WHERE isDeleted = 0 ORDER BY capturedAt DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function getScreenshotCount() {
  const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM screenshots WHERE isDeleted = 0`);
  return row?.count ?? 0;
}

export async function updateScreenshotCategory(id, category, confidence) {
  await db.runAsync(
    `UPDATE screenshots SET aiCategory = ?, aiConfidence = ? WHERE id = ?`,
    [category, confidence, id]
  );
}

export async function setWantList(id, inWantList) {
  await db.runAsync(`UPDATE screenshots SET inWantList = ? WHERE id = ?`, [inWantList ? 1 : 0, id]);
  // Also add/remove from want-list stack
  if (inWantList) {
    await addToStack('want-list', id, 'user');
  } else {
    await removeFromStack('want-list', id);
  }
}

// ── STACKS ──────────────────────────────────────────────────────────────────

export async function createStack({ name, emoji = '📁', isAiSuggested = false }) {
  const id = 'stack-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const maxOrder = await db.getFirstAsync(`SELECT MAX(sortOrder) as mo FROM stacks`);
  const sortOrder = (maxOrder?.mo ?? 0) + 1;
  await db.runAsync(
    `INSERT INTO stacks (id, name, emoji, isAiSuggested, sortOrder) VALUES (?, ?, ?, ?, ?)`,
    [id, name, emoji, isAiSuggested ? 1 : 0, sortOrder]
  );
  return id;
}

export async function getAllStacks() {
  return db.getAllAsync(`SELECT * FROM stacks ORDER BY isSystem DESC, sortOrder ASC`);
}

export async function getStackWithCount(stackId) {
  return db.getFirstAsync(
    `SELECT s.*, COUNT(si.id) as itemCount
     FROM stacks s
     LEFT JOIN stack_items si ON si.stackId = s.id
     WHERE s.id = ?
     GROUP BY s.id`,
    [stackId]
  );
}

export async function getAllStacksWithCounts() {
  return db.getAllAsync(
    `SELECT s.*, COUNT(si.id) as itemCount
     FROM stacks s
     LEFT JOIN stack_items si ON si.stackId = s.id
     GROUP BY s.id
     ORDER BY s.isSystem DESC, s.sortOrder ASC`
  );
}

export async function deleteStack(stackId) {
  await db.runAsync(`DELETE FROM stacks WHERE id = ? AND isSystem = 0`, [stackId]);
}

export async function updateStack(id, { name, emoji }) {
  await db.runAsync(`UPDATE stacks SET name = ?, emoji = ? WHERE id = ?`, [name, emoji, id]);
}

// ── STACK ITEMS ──────────────────────────────────────────────────────────────

export async function addToStack(stackId, screenshotId, addedBy = 'user') {
  const itemId = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const maxPos = await db.getFirstAsync(
    `SELECT MAX(position) as mp FROM stack_items WHERE stackId = ?`, [stackId]
  );
  const position = (maxPos?.mp ?? -1) + 1;
  await db.runAsync(
    `INSERT OR IGNORE INTO stack_items (id, stackId, screenshotId, position, addedBy)
     VALUES (?, ?, ?, ?, ?)`,
    [itemId, stackId, screenshotId, position, addedBy]
  );
}

export async function removeFromStack(stackId, screenshotId) {
  await db.runAsync(
    `DELETE FROM stack_items WHERE stackId = ? AND screenshotId = ?`,
    [stackId, screenshotId]
  );
}

export async function getStackItems(stackId, { limit = 60, offset = 0 } = {}) {
  return db.getAllAsync(
    `SELECT sc.* FROM screenshots sc
     JOIN stack_items si ON si.screenshotId = sc.id
     WHERE si.stackId = ? AND sc.isDeleted = 0
     ORDER BY si.position DESC, si.addedAt DESC
     LIMIT ? OFFSET ?`,
    [stackId, limit, offset]
  );
}

export async function isInStack(stackId, screenshotId) {
  const row = await db.getFirstAsync(
    `SELECT id FROM stack_items WHERE stackId = ? AND screenshotId = ?`,
    [stackId, screenshotId]
  );
  return !!row;
}

export async function getStacksForScreenshot(screenshotId) {
  return db.getAllAsync(
    `SELECT s.* FROM stacks s
     JOIN stack_items si ON si.stackId = s.id
     WHERE si.screenshotId = ?`,
    [screenshotId]
  );
}

// ── AI SUGGESTIONS ───────────────────────────────────────────────────────────

export async function getUncategorisedScreenshots() {
  return db.getAllAsync(
    `SELECT * FROM screenshots
     WHERE aiCategory IS NULL AND isDeleted = 0
     ORDER BY capturedAt DESC`
  );
}

export async function getScreenshotsByCategory(category) {
  return db.getAllAsync(
    `SELECT * FROM screenshots
     WHERE aiCategory = ? AND isDeleted = 0
     ORDER BY capturedAt DESC`,
    [category]
  );
}

// ── CLEANUP ──────────────────────────────────────────────────────────────────

export async function markDeleted(localIdentifier) {
  await db.runAsync(
    `UPDATE screenshots SET isDeleted = 1 WHERE localIdentifier = ?`,
    [localIdentifier]
  );
}

export async function clearAllData() {
  await db.execAsync(`
    DELETE FROM stack_items;
    DELETE FROM screenshots;
    DELETE FROM stacks WHERE isSystem = 0;
    DELETE FROM user_settings;
  `);
}

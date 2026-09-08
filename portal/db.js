import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const identifier = () => randomBytes(16).toString('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function openDatabase(directory = process.env.DATA_DIR || 'portal/data') {
  const dir = resolve(directory);
  mkdirSync(join(dir, 'models'), { recursive: true, mode: 0o700 });
  mkdirSync(join(dir, 'incoming'), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dir, 'portal.sqlite'));
  chmodSync(join(dir, 'portal.sqlite'), 0o600);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE COLLATE NOCASE NOT NULL,
      name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','client')),
      password_hash TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      sample INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
      name TEXT NOT NULL, storage_key TEXT UNIQUE NOT NULL, size INTEGER NOT NULL,
      units TEXT NOT NULL DEFAULT 'units' CHECK(units IN ('units','m','ft')),
      created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
    );
  `);
  return { db, dir };
}

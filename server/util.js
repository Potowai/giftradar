import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const DATA_DIR = path.join(import.meta.dirname, 'data')

export function dataPath(name) {
  return path.join(DATA_DIR, name)
}

export async function readJson(name, fallback = []) {
  try {
    const raw = await readFile(dataPath(name), 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export async function writeJson(name, value) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(dataPath(name), JSON.stringify(value, null, 2))
}
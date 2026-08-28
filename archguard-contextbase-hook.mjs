import { appendFile, lstat } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

const INVALIDATION_SCHEMA = 'contextbase.invalidation/1.0'

function safeRelativePath(value) {
  if (typeof value !== 'string' || !value || value !== value.normalize('NFC')
    || isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(value)
    || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('ContextBase invalidation path is unsafe')
  }
  return value
}

async function recordContextBaseInvalidation(repositoryRoot, targetPath, outcome) {
  const root = resolve(repositoryRoot)
  const directory = resolve(root, '.contextbase')
  const path = relative(root, directory)
  if (path !== '.contextbase') throw new Error('ContextBase managed path escapes repository')
  let status
  try {
    status = await lstat(directory)
  } catch (error) {
    if (error instanceof Error && error.code === 'ENOENT') {
      return { recorded: false, reason: 'contextbase-not-initialized' }
    }
    throw error
  }
  if (status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error('.contextbase must be a real directory')
  }
  const event = {
    schemaVersion: INVALIDATION_SCHEMA,
    at: new Date().toISOString(),
    path: safeRelativePath(targetPath),
    source: 'archguard-checkpoint',
    outcome,
  }
  await appendFile(resolve(directory, 'invalidation.jsonl'), `${JSON.stringify(event)}\n`, {
    mode: 0o600,
  })
  return { recorded: true, event }
}

export { INVALIDATION_SCHEMA, recordContextBaseInvalidation }

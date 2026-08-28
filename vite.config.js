import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const wordsFilePath = fileURLToPath(new URL('./src/games/vocabulary/words.data.json', import.meta.url))
const wordsRelPath = 'src/games/vocabulary/words.data.json'
const sentencesFilePath = fileURLToPath(new URL('./src/games/essay/sentences.data.json', import.meta.url))
const sentencesRelPath = 'src/games/essay/sentences.data.json'
const synonymsFilePath = fileURLToPath(new URL('./src/games/essay/synonyms.data.json', import.meta.url))
const synonymsRelPath = 'src/games/essay/synonyms.data.json'
const rootsFilePath = fileURLToPath(new URL('./src/games/roots/roots.data.json', import.meta.url))
const rootsRelPath = 'src/games/roots/roots.data.json'

function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: projectRoot }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

// Top-level-array-length delta between HEAD's copy of the file and the
// current one on disk — shared by every dataset's commit-message builder
// below. Returns null (instead of throwing) when HEAD has no version of the
// file yet or it's unparsable, so callers can fall back to a generic message.
async function arrayLengthDelta(filePath, relPath) {
  try {
    const [headRaw, currentRaw] = await Promise.all([runGit(['show', `HEAD:${relPath}`]), readFile(filePath, 'utf-8')])
    return JSON.parse(currentRaw).length - JSON.parse(headRaw).length
  } catch {
    return null
  }
}

async function vocabCommitMessage() {
  const delta = await arrayLengthDelta(wordsFilePath, wordsRelPath)
  if (delta > 0) return `Vocabulary: add ${delta} word${delta === 1 ? '' : 's'} to static dictionary`
  if (delta < 0) return `Vocabulary: remove ${-delta} word${delta === -1 ? '' : 's'} from static dictionary`
  return 'Vocabulary: update static dictionary'
}

async function sentencesCommitMessage() {
  const delta = await arrayLengthDelta(sentencesFilePath, sentencesRelPath)
  if (delta > 0) return `Essay: add ${delta} template sentence${delta === 1 ? '' : 's'} to static data`
  if (delta < 0) return `Essay: remove ${-delta} template sentence${delta === -1 ? '' : 's'} from static data`
  return 'Essay: update static template data'
}

async function synonymsCommitMessage() {
  const delta = await arrayLengthDelta(synonymsFilePath, synonymsRelPath)
  if (delta > 0) return `Essay: add ${delta} synonym word${delta === 1 ? '' : 's'} to static data`
  if (delta < 0) return `Essay: remove ${-delta} synonym word${delta === -1 ? '' : 's'} from static data`
  return 'Essay: update static synonym data'
}

// Roots are only ever edited in place (root/meaning/example), never
// added or removed, so there's no count delta worth reporting here.
async function rootsCommitMessage() {
  return 'Roots: update static root data'
}

// Auto-commits+pushes a static dataset after it's been quiet for `idleMs`:
// every save resets the timer, so a whole session of edits collapses into
// one push right after the user actually stops, instead of one push per
// edit. Runs inside the dev server itself (not the editor), so it works for
// as long as `npm run dev` is up — VS Code doesn't need to be open. Each
// caller gets its own independent timer via its own closure.
function scheduleAutoPush(relPath, buildMessage, idleMs = 20000) {
  let timer = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      timer = null
      try {
        const status = await runGit(['status', '--porcelain', '--', relPath])
        if (!status.trim()) return
        const message = await buildMessage()
        await runGit(['add', relPath])
        await runGit(['commit', '-m', message])
        await runGit(['push'])
        console.log(`[auto-push] ${message}`)
      } catch (err) {
        console.error('[auto-push] failed:', err.message)
      }
    }, idleMs)
  }
}

// Dev-only API so a dataset lives in the project (as a .data.json file)
// instead of the browser's localStorage — edits made from the UI are written
// straight back to that file, so the data is shared across every device that
// talks to this dev server, not siloed per browser.
//
// That route only exists on the Vite dev server, not on a static host like
// Vercel, so production instead uses the .data.json baked straight into the
// build. Editing from a deployed site won't persist — edit it locally
// (npm run dev) and redeploy to update what's shown in production.
function jsonFileApiPlugin(name, route, filePath, onSaved) {
  return {
    name,
    configureServer(server) {
      server.middlewares.use(route, async (req, res) => {
        if (req.method === 'GET') {
          try {
            const raw = await readFile(filePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(raw)
          } catch (err) {
            // Must NOT fall back to "[]" here — the client treats any array
            // response (including an empty one) as the real data and will
            // happily persist new entries on top of it, permanently wiping
            // the file on the next save. A failed read has to look like a
            // failure, not like "the data is empty".
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(err) }))
          }
          return
        }

        if (req.method === 'PUT') {
          const chunks = []
          req.on('data', (chunk) => {
            chunks.push(chunk)
          })
          req.on('end', async () => {
            try {
              // Buffer.concat before decoding — decoding each chunk on its own
              // (e.g. `body += chunk`) corrupts any multi-byte UTF-8 character
              // (Hebrew is 2 bytes/char) that a chunk boundary happens to split,
              // replacing it with U+FFFD on both sides of the split.
              const body = Buffer.concat(chunks).toString('utf-8')
              const data = JSON.parse(body)
              if (!Array.isArray(data)) throw new Error('expected an array')

              // Guard against a stale client (an old browser tab, or a
              // second `npm run dev` left running from an earlier session)
              // silently clobbering the real file with a smaller snapshot it
              // loaded long ago. A legitimate bulk deletion of more than half
              // the entries in one save is rare enough to be worth forcing an
              // explicit retry instead of risking data loss.
              let existingCount = 0
              try {
                const existing = JSON.parse(await readFile(filePath, 'utf-8'))
                if (Array.isArray(existing)) existingCount = existing.length
              } catch {
                // no existing file / unreadable — nothing to protect
              }
              if (existingCount > 5 && data.length < existingCount / 2) {
                res.statusCode = 409
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    error: `refusing to overwrite ${existingCount} entries with only ${data.length} — this looks like a stale save from an old tab or a second dev server. Reload the page and retry.`,
                  }),
                )
                return
              }

              await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
              res.statusCode = 200
              res.end('ok')
              onSaved?.()
            } catch (err) {
              res.statusCode = 400
              res.end(String(err))
            }
          })
          return
        }

        res.statusCode = 405
        res.end('method not allowed')
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    jsonFileApiPlugin('vocabulary-api', '/api/vocabulary', wordsFilePath, scheduleAutoPush(wordsRelPath, vocabCommitMessage)),
    jsonFileApiPlugin(
      'essay-sentences-api',
      '/api/essay-sentences',
      sentencesFilePath,
      scheduleAutoPush(sentencesRelPath, sentencesCommitMessage),
    ),
    jsonFileApiPlugin(
      'essay-synonyms-api',
      '/api/essay-synonyms',
      synonymsFilePath,
      scheduleAutoPush(synonymsRelPath, synonymsCommitMessage),
    ),
    jsonFileApiPlugin('roots-api', '/api/roots', rootsFilePath, scheduleAutoPush(rootsRelPath, rootsCommitMessage)),
  ],
})

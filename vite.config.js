import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const wordsFilePath = fileURLToPath(new URL('./src/games/vocabulary/words.data.json', import.meta.url))
const sentencesFilePath = fileURLToPath(new URL('./src/games/essay/sentences.data.json', import.meta.url))
const synonymsFilePath = fileURLToPath(new URL('./src/games/essay/synonyms.data.json', import.meta.url))

// Dev-only API so a dataset lives in the project (as a .data.json file)
// instead of the browser's localStorage — edits made from the UI are written
// straight back to that file, so the data is shared across every device that
// talks to this dev server, not siloed per browser.
//
// That route only exists on the Vite dev server, not on a static host like
// Vercel, so production instead uses the .data.json baked straight into the
// build. Editing from a deployed site won't persist — edit it locally
// (npm run dev) and redeploy to update what's shown in production.
function jsonFileApiPlugin(name, route, filePath) {
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
    jsonFileApiPlugin('vocabulary-api', '/api/vocabulary', wordsFilePath),
    jsonFileApiPlugin('essay-sentences-api', '/api/essay-sentences', sentencesFilePath),
    jsonFileApiPlugin('essay-synonyms-api', '/api/essay-synonyms', synonymsFilePath),
  ],
})

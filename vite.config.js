import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const wordsFilePath = fileURLToPath(new URL('./src/games/vocabulary/words.data.json', import.meta.url))

// Dev-only API so the vocabulary dictionary lives in the project (words.data.json)
// instead of the browser's localStorage — edits made from the UI are written
// straight back to that file, so the word list is shared across every device
// that talks to this dev server, not siloed per browser.
function vocabularyApiPlugin() {
  return {
    name: 'vocabulary-api',
    configureServer(server) {
      server.middlewares.use('/api/vocabulary', async (req, res) => {
        if (req.method === 'GET') {
          try {
            const raw = await readFile(wordsFilePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(raw)
          } catch {
            res.setHeader('Content-Type', 'application/json')
            res.end('[]')
          }
          return
        }

        if (req.method === 'PUT') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const words = JSON.parse(body)
              if (!Array.isArray(words)) throw new Error('expected an array')
              await writeFile(wordsFilePath, JSON.stringify(words, null, 2) + '\n', 'utf-8')
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
  plugins: [react(), vocabularyApiPlugin()],
})

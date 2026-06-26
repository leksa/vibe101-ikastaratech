import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import apiRoutes from './api/routes.js'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection (server continues):', reason?.message || reason)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (server continues):', err.message)
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// API routes
app.use('/api', apiRoutes)

// Serve built frontend in production (frontend/ is a sibling of backend/)
const distPath = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(distPath))

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'))
  }
})

app.listen(PORT, () => {
  console.log(`SPPG Dashboard API running on http://localhost:${PORT}`)
})

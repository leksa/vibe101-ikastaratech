import pg from 'pg'

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5435'),
  database: process.env.PGDATABASE || 'sppg',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'sppg',
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export default {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
}

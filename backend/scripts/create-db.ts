import mysql from 'mysql2/promise'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const host = process.env.MYSQL_HOST || '127.0.0.1'
const port = Number(process.env.MYSQL_PORT || 3306)
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || ''
const db = process.env.MYSQL_DATABASE || 'elite_ethiopia'

async function main() {
  try {
    const conn = await mysql.createConnection({ host, port, user, password })
    console.log(`Connected to MySQL at ${host}:${port} as ${user}`)
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    console.log(`Database \`${db}\` ensured (created if missing).`)
    await conn.end()
  } catch (e) {
    console.error('Failed to create database:', e)
    process.exit(1)
  }
}

void main()

import Database from 'better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

const DB_PATH = process.env.DATABASE_PATH || './pelus-exchange.db'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), DB_PATH)
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeDb(db)
  }
  return db
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('pantalon', 'pulso', 'remera')),
      size TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_data TEXT,
      status TEXT NOT NULL DEFAULT 'disponible' CHECK(status IN ('disponible', 'intercambiado')),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now', '+60 days'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      interest_type TEXT NOT NULL DEFAULT 'comentario'
        CHECK(interest_type IN ('interesado', 'no_interesado', 'comentario')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      item_id INTEGER REFERENCES items(id),
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Migration: add expires_at to existing tables that don't have it yet
  try {
    db.exec(`ALTER TABLE items ADD COLUMN expires_at TEXT`)
    db.exec(`UPDATE items SET expires_at = datetime(created_at, '+60 days') WHERE expires_at IS NULL`)
  } catch {
    // Column already exists — no-op
  }

  seedDb(db)
}

function seedDb(db: Database.Database) {
  const existing = db.prepare('SELECT id FROM users LIMIT 1').get()
  if (existing) return

  const uStmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
  const u1 = uStmt.run('María González', 'maria@demo.com', bcrypt.hashSync('demo123', 10))
  const u2 = uStmt.run('Carlos Rodríguez', 'carlos@demo.com', bcrypt.hashSync('demo123', 10))
  const u3 = uStmt.run('Lucía Fernández', 'lucia@demo.com', bcrypt.hashSync('demo123', 10))
  const u1Id = u1.lastInsertRowid as number
  const u2Id = u2.lastInsertRowid as number
  const u3Id = u3.lastInsertRowid as number

  const iStmt = db.prepare(
    'INSERT INTO items (user_id, title, category, size, description) VALUES (?, ?, ?, ?, ?)'
  )
  const i1 = iStmt.run(
    u1Id, 'Pantalón verde del colegio', 'pantalon', 'M',
    'En muy buen estado, usado solo un ciclo escolar. Sin roturas ni manchas.'
  )
  const i2 = iStmt.run(
    u2Id, 'Remera amarilla con escudo Pablo Freire', 'remera', 'S',
    'Remera del colegio sin manchas, lavada y lista para usar. Muy poco uso.'
  )
  const i3 = iStmt.run(
    u3Id, 'Pulso azul del colegio', 'pulso', 'L',
    'Buzo talle L, excelente estado, le queda grande a mi hijo ya.'
  )
  iStmt.run(
    u1Id, 'Pantalón talle grande', 'pantalon', 'XL',
    'Pantalón usado dos años, buen estado, sin roturas.'
  )
  iStmt.run(
    u2Id, 'Remera talle XS', 'remera', 'XS',
    'Casi sin uso, perfecta para primer año.'
  )

  const cStmt = db.prepare(
    'INSERT INTO comments (item_id, user_id, content, interest_type) VALUES (?, ?, ?, ?)'
  )
  cStmt.run(i1.lastInsertRowid, u2Id, '¡Me interesa! Tengo una remera para intercambiar.', 'interesado')
  cStmt.run(i1.lastInsertRowid, u3Id, '¿Cuál es el estado de la cintura elástica?', 'comentario')
  cStmt.run(i2.lastInsertRowid, u1Id, 'Perfecto, justo lo que necesitaba para mi hija!', 'interesado')
  cStmt.run(i3.lastInsertRowid, u2Id, 'No me sirve el talle pero gracias igual.', 'no_interesado')
}

export interface User {
  id: number
  name: string
  email: string
  password_hash: string
  created_at: string
}

export interface Item {
  id: number
  user_id: number
  title: string
  category: 'pantalon' | 'pulso' | 'remera'
  size: string
  description: string
  image_data: string | null
  status: 'disponible' | 'intercambiado'
  created_at: string
  expires_at: string
  owner_name?: string
  comment_count?: number
  interest_count?: number
}

export interface Comment {
  id: number
  item_id: number
  user_id: number
  content: string
  interest_type: 'interesado' | 'no_interesado' | 'comentario'
  created_at: string
  user_name?: string
}

export interface Notification {
  id: number
  user_id: number
  item_id: number | null
  message: string
  read: number
  created_at: string
  item_title?: string
}

export const dbQueries = {
  getUserByEmail: (email: string) =>
    getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined,

  getUserById: (id: number) =>
    getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined,

  createUser: (data: { name: string; email: string; password_hash: string }) =>
    getDb()
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(data.name, data.email, data.password_hash),

  getItems: (filter?: { category?: string }) => {
    let q = `
      SELECT i.id, i.user_id, i.title, i.category, i.size, i.description,
             i.image_data, i.status, i.created_at, i.expires_at, u.name as owner_name,
             COUNT(c.id) as comment_count,
             SUM(CASE WHEN c.interest_type = 'interesado' THEN 1 ELSE 0 END) as interest_count
      FROM items i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN comments c ON c.item_id = i.id`
    const params: unknown[] = []
    if (filter?.category) {
      q += ' WHERE i.category = ?'
      params.push(filter.category)
    }
    q += ' GROUP BY i.id ORDER BY i.created_at DESC'
    return getDb().prepare(q).all(...params) as Item[]
  },

  getItemById: (id: number) =>
    getDb()
      .prepare(`
        SELECT i.*, u.name as owner_name,
          COUNT(c.id) as comment_count,
          SUM(CASE WHEN c.interest_type = 'interesado' THEN 1 ELSE 0 END) as interest_count
        FROM items i
        JOIN users u ON i.user_id = u.id
        LEFT JOIN comments c ON c.item_id = i.id
        WHERE i.id = ?
        GROUP BY i.id
      `)
      .get(id) as Item | undefined,

  getItemsByUser: (userId: number) =>
    getDb()
      .prepare(`
        SELECT i.*, u.name as owner_name,
          COUNT(c.id) as comment_count,
          SUM(CASE WHEN c.interest_type = 'interesado' THEN 1 ELSE 0 END) as interest_count
        FROM items i
        JOIN users u ON i.user_id = u.id
        LEFT JOIN comments c ON c.item_id = i.id
        WHERE i.user_id = ?
        GROUP BY i.id ORDER BY i.created_at DESC
      `)
      .all(userId) as Item[],

  createItem: (data: {
    user_id: number
    title: string
    category: string
    size: string
    description: string
    image_data: string | null
  }) =>
    getDb()
      .prepare(
        'INSERT INTO items (user_id, title, category, size, description, image_data) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(data.user_id, data.title, data.category, data.size, data.description, data.image_data),

  markItemAsExchanged: (id: number) =>
    getDb().prepare("UPDATE items SET status = 'intercambiado' WHERE id = ?").run(id),

  isItemExpired: (item: Item): boolean => {
    if (!item.expires_at) return false
    return new Date(item.expires_at.replace(' ', 'T') + 'Z') < new Date()
  },

  getCommentsByItem: (itemId: number) =>
    getDb()
      .prepare(`
        SELECT c.*, u.name as user_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.item_id = ?
        ORDER BY c.created_at ASC
      `)
      .all(itemId) as Comment[],

  createComment: (data: {
    item_id: number
    user_id: number
    content: string
    interest_type: string
  }) =>
    getDb()
      .prepare(
        'INSERT INTO comments (item_id, user_id, content, interest_type) VALUES (?, ?, ?, ?)'
      )
      .run(data.item_id, data.user_id, data.content, data.interest_type),

  getInterestedUsers: (itemId: number) =>
    getDb()
      .prepare(`
        SELECT DISTINCT u.id, u.name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.item_id = ? AND c.interest_type = 'interesado'
      `)
      .all(itemId) as { id: number; name: string }[],

  getNotificationsByUser: (userId: number) =>
    getDb()
      .prepare(`
        SELECT n.*, i.title as item_title
        FROM notifications n
        LEFT JOIN items i ON n.item_id = i.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50
      `)
      .all(userId) as Notification[],

  getUnreadCount: (userId: number) => {
    const r = getDb()
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0')
      .get(userId) as { count: number }
    return r.count
  },

  createNotification: (data: { user_id: number; item_id: number; message: string }) =>
    getDb()
      .prepare('INSERT INTO notifications (user_id, item_id, message) VALUES (?, ?, ?)')
      .run(data.user_id, data.item_id, data.message),

  markAllNotificationsRead: (userId: number) =>
    getDb().prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId),
}

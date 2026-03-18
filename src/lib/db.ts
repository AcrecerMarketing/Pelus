import Database from 'better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

const DB_PATH = process.env.DATABASE_PATH || './salon.db'

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
    CREATE TABLE IF NOT EXISTS salons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      hours_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'employee')),
      salon_id INTEGER REFERENCES salons(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id INTEGER NOT NULL REFERENCES salons(id),
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      price REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      salon_id INTEGER NOT NULL REFERENCES salons(id),
      specialty TEXT,
      bio TEXT,
      avatar_color TEXT DEFAULT '#7C3AED'
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id INTEGER NOT NULL REFERENCES salons(id),
      client_name TEXT NOT NULL,
      client_phone TEXT,
      client_email TEXT,
      service_id INTEGER NOT NULL REFERENCES services(id),
      employee_id INTEGER REFERENCES employees(id),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS working_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );
  `)

  seedDb(db)
}

function seedDb(db: Database.Database) {
  const existing = db.prepare('SELECT id FROM salons LIMIT 1').get()
  if (existing) return

  const salonStmt = db.prepare(`
    INSERT INTO salons (name, address, phone, email, hours_json)
    VALUES (?, ?, ?, ?, ?)
  `)
  const salonResult = salonStmt.run(
    'Pelus Salon & Spa',
    '123 Main Street, Suite 100',
    '+1 (555) 123-4567',
    'info@pelussalon.com',
    JSON.stringify({
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '20:00' },
      saturday: { open: '09:00', close: '18:00' },
      sunday: null,
    })
  )
  const salonId = salonResult.lastInsertRowid as number

  const services = [
    { name: 'Corte de Cabello', description: 'Corte profesional adaptado a tu estilo', duration: 45, price: 35 },
    { name: 'Coloración', description: 'Coloración completa con productos premium', duration: 120, price: 85 },
    { name: 'Manicure', description: 'Manicure clásica con esmaltado', duration: 45, price: 25 },
    { name: 'Pedicure', description: 'Pedicure relajante con masaje', duration: 60, price: 35 },
    { name: 'Tratamiento Capilar', description: 'Tratamiento intensivo de hidratación y brillo', duration: 90, price: 65 },
  ]

  const serviceStmt = db.prepare(`
    INSERT INTO services (salon_id, name, description, duration_minutes, price, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `)
  for (const s of services) {
    serviceStmt.run(salonId, s.name, s.description, s.duration, s.price)
  }

  const ownerHash = bcrypt.hashSync('owner123', 10)
  const adminHash = bcrypt.hashSync('admin123', 10)
  const empHash = bcrypt.hashSync('employee123', 10)

  const userStmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, salon_id)
    VALUES (?, ?, ?, ?, ?)
  `)

  userStmt.run('Sofia Martínez', 'owner@salon.com', ownerHash, 'owner', salonId)
  userStmt.run('Carlos García', 'admin@salon.com', adminHash, 'admin', salonId)
  const empResult = userStmt.run('Ana López', 'employee@salon.com', empHash, 'employee', salonId)
  const empUserId = empResult.lastInsertRowid as number

  const emp2Result = userStmt.run('Miguel Torres', 'miguel@salon.com', bcrypt.hashSync('employee123', 10), 'employee', salonId)
  const emp2UserId = emp2Result.lastInsertRowid as number

  const employeeStmt = db.prepare(`
    INSERT INTO employees (user_id, salon_id, specialty, bio, avatar_color)
    VALUES (?, ?, ?, ?, ?)
  `)
  const emp1 = employeeStmt.run(empUserId, salonId, 'Coloración y Cortes', 'Especialista en coloración con 5 años de experiencia', '#7C3AED')
  const emp2 = employeeStmt.run(emp2UserId, salonId, 'Tratamientos Capilares', 'Experto en tratamientos de hidratación y keratina', '#059669')

  const emp1Id = emp1.lastInsertRowid as number
  const emp2Id = emp2.lastInsertRowid as number

  const hoursStmt = db.prepare(`
    INSERT INTO working_hours (employee_id, day_of_week, start_time, end_time)
    VALUES (?, ?, ?, ?)
  `)

  for (const empId of [emp1Id, emp2Id]) {
    for (let day = 1; day <= 6; day++) {
      hoursStmt.run(empId, day, '09:00', '18:00')
    }
  }

  const apptStmt = db.prepare(`
    INSERT INTO appointments (salon_id, client_name, client_phone, client_email, service_id, employee_id, start_time, end_time, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const fmtDate = (d: Date, hour: number, min: number) => {
    const dd = new Date(d)
    dd.setHours(hour, min, 0, 0)
    return dd.toISOString().slice(0, 16).replace('T', ' ')
  }

  apptStmt.run(salonId, 'María González', '555-0101', 'maria@email.com', 1, emp1Id, fmtDate(today, 10, 0), fmtDate(today, 10, 45), 'confirmed', 'Cliente regular')
  apptStmt.run(salonId, 'Laura Sánchez', '555-0102', 'laura@email.com', 2, emp1Id, fmtDate(today, 14, 0), fmtDate(today, 16, 0), 'pending', '')
  apptStmt.run(salonId, 'Pedro Rodríguez', '555-0103', 'pedro@email.com', 3, emp2Id, fmtDate(today, 11, 0), fmtDate(today, 11, 45), 'confirmed', '')
  apptStmt.run(salonId, 'Isabella Fernández', '555-0104', 'isabella@email.com', 5, emp2Id, fmtDate(tomorrow, 10, 0), fmtDate(tomorrow, 11, 30), 'pending', 'Primera visita')
}

export interface Salon {
  id: number
  name: string
  address: string
  phone: string
  email: string
  hours_json: string
  created_at: string
}

export interface User {
  id: number
  name: string
  email: string
  password_hash: string
  role: 'owner' | 'admin' | 'employee'
  salon_id: number
  created_at: string
}

export interface Service {
  id: number
  salon_id: number
  name: string
  description: string
  duration_minutes: number
  price: number
  active: number
}

export interface Employee {
  id: number
  user_id: number
  salon_id: number
  specialty: string
  bio: string
  avatar_color: string
  name?: string
  email?: string
}

export interface Appointment {
  id: number
  salon_id: number
  client_name: string
  client_phone: string
  client_email: string
  service_id: number
  employee_id: number
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes: string
  created_at: string
  service_name?: string
  employee_name?: string
}

export interface WorkingHours {
  id: number
  employee_id: number
  day_of_week: number
  start_time: string
  end_time: string
}

export const dbQueries = {
  getSalon: (id: number) => getDb().prepare('SELECT * FROM salons WHERE id = ?').get(id) as Salon | undefined,

  updateSalon: (id: number, data: Partial<Salon>) => {
    const db = getDb()
    return db.prepare(`
      UPDATE salons SET name = ?, address = ?, phone = ?, email = ?, hours_json = ?
      WHERE id = ?
    `).run(data.name, data.address, data.phone, data.email, data.hours_json, id)
  },

  getUserByEmail: (email: string) => getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined,

  getUserById: (id: number) => getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined,

  getUsersBySalon: (salonId: number) => getDb().prepare('SELECT id, name, email, role, created_at FROM users WHERE salon_id = ?').all(salonId) as Omit<User, 'password_hash'>[],

  createUser: (data: { name: string; email: string; password_hash: string; role: string; salon_id: number }) => {
    return getDb().prepare(`
      INSERT INTO users (name, email, password_hash, role, salon_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.name, data.email, data.password_hash, data.role, data.salon_id)
  },

  updateUser: (id: number, data: { name: string; email: string; role: string }) => {
    return getDb().prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?').run(data.name, data.email, data.role, id)
  },

  deleteUser: (id: number) => getDb().prepare('DELETE FROM users WHERE id = ?').run(id),

  getServices: (salonId: number) => getDb().prepare('SELECT * FROM services WHERE salon_id = ? ORDER BY name').all(salonId) as Service[],

  getActiveServices: (salonId: number) => getDb().prepare('SELECT * FROM services WHERE salon_id = ? AND active = 1 ORDER BY name').all(salonId) as Service[],

  getServiceById: (id: number) => getDb().prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | undefined,

  createService: (data: { salon_id: number; name: string; description: string; duration_minutes: number; price: number }) => {
    return getDb().prepare(`
      INSERT INTO services (salon_id, name, description, duration_minutes, price, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(data.salon_id, data.name, data.description, data.duration_minutes, data.price)
  },

  updateService: (id: number, data: { name: string; description: string; duration_minutes: number; price: number; active: number }) => {
    return getDb().prepare(`
      UPDATE services SET name = ?, description = ?, duration_minutes = ?, price = ?, active = ? WHERE id = ?
    `).run(data.name, data.description, data.duration_minutes, data.price, data.active, id)
  },

  deleteService: (id: number) => getDb().prepare('DELETE FROM services WHERE id = ?').run(id),

  getEmployees: (salonId: number) => {
    return getDb().prepare(`
      SELECT e.*, u.name, u.email FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.salon_id = ?
    `).all(salonId) as Employee[]
  },

  getEmployeeById: (id: number) => {
    return getDb().prepare(`
      SELECT e.*, u.name, u.email FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `).get(id) as Employee | undefined
  },

  getEmployeeByUserId: (userId: number) => {
    return getDb().prepare(`
      SELECT e.*, u.name, u.email FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id = ?
    `).get(userId) as Employee | undefined
  },

  createEmployee: (data: { user_id: number; salon_id: number; specialty: string; bio: string; avatar_color: string }) => {
    return getDb().prepare(`
      INSERT INTO employees (user_id, salon_id, specialty, bio, avatar_color)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.user_id, data.salon_id, data.specialty, data.bio, data.avatar_color)
  },

  updateEmployee: (id: number, data: { specialty: string; bio: string; avatar_color: string }) => {
    return getDb().prepare('UPDATE employees SET specialty = ?, bio = ?, avatar_color = ? WHERE id = ?').run(data.specialty, data.bio, data.avatar_color, id)
  },

  deleteEmployee: (id: number) => getDb().prepare('DELETE FROM employees WHERE id = ?').run(id),

  getAppointments: (salonId: number) => {
    return getDb().prepare(`
      SELECT a.*, s.name as service_name, u.name as employee_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE a.salon_id = ?
      ORDER BY a.start_time DESC
    `).all(salonId) as Appointment[]
  },

  getAppointmentsByEmployee: (employeeId: number) => {
    return getDb().prepare(`
      SELECT a.*, s.name as service_name, u.name as employee_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE a.employee_id = ?
      ORDER BY a.start_time DESC
    `).all(employeeId) as Appointment[]
  },

  getAppointmentsByDateRange: (salonId: number, startDate: string, endDate: string) => {
    return getDb().prepare(`
      SELECT a.*, s.name as service_name, s.duration_minutes, u.name as employee_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE a.salon_id = ? AND a.start_time >= ? AND a.start_time <= ?
      AND a.status != 'cancelled'
      ORDER BY a.start_time
    `).all(salonId, startDate, endDate) as Appointment[]
  },

  createAppointment: (data: {
    salon_id: number
    client_name: string
    client_phone: string
    client_email: string
    service_id: number
    employee_id: number | null
    start_time: string
    end_time: string
    status: string
    notes: string
  }) => {
    return getDb().prepare(`
      INSERT INTO appointments (salon_id, client_name, client_phone, client_email, service_id, employee_id, start_time, end_time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.salon_id, data.client_name, data.client_phone, data.client_email, data.service_id, data.employee_id, data.start_time, data.end_time, data.status, data.notes)
  },

  updateAppointment: (id: number, data: Partial<Appointment>) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
    const values = [...Object.values(data), id]
    return getDb().prepare(`UPDATE appointments SET ${fields} WHERE id = ?`).run(...values)
  },

  updateAppointmentStatus: (id: number, status: string) => {
    return getDb().prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id)
  },

  deleteAppointment: (id: number) => getDb().prepare('DELETE FROM appointments WHERE id = ?').run(id),

  getWorkingHours: (employeeId: number) => {
    return getDb().prepare('SELECT * FROM working_hours WHERE employee_id = ? ORDER BY day_of_week').all(employeeId) as WorkingHours[]
  },

  getRevenueStats: (salonId: number) => {
    const db = getDb()
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

    const monthly = db.prepare(`
      SELECT COALESCE(SUM(s.price), 0) as revenue, COUNT(a.id) as appointments
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.salon_id = ? AND a.status = 'completed'
      AND DATE(a.start_time) >= ? AND DATE(a.start_time) <= ?
    `).get(salonId, startOfMonth, endOfMonth) as { revenue: number; appointments: number }

    const total = db.prepare(`
      SELECT COALESCE(SUM(s.price), 0) as revenue, COUNT(a.id) as appointments
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.salon_id = ? AND a.status = 'completed'
    `).get(salonId) as { revenue: number; appointments: number }

    const topServices = db.prepare(`
      SELECT s.name, COUNT(a.id) as count, COALESCE(SUM(s.price), 0) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.salon_id = ? AND a.status != 'cancelled'
      GROUP BY s.id, s.name
      ORDER BY count DESC
      LIMIT 5
    `).all(salonId) as { name: string; count: number; revenue: number }[]

    return { monthly, total, topServices }
  },
}

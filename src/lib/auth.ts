import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'salon-super-secret-key-change-in-production'
const secret = new TextEncoder().encode(JWT_SECRET)

export interface JWTPayload {
  userId: number
  email: string
  role: 'owner' | 'admin' | 'employee'
  salonId: number
  name: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get('session')?.value
  if (!token) return null
  return await verifyToken(token)
}

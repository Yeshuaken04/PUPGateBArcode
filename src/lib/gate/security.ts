import crypto from 'crypto';
import { NextRequest } from 'next/server';

export function verifyDeviceAuth(request: NextRequest): { authorized: boolean; reason?: string } {
  const configuredSecret = process.env.GATE_API_SECRET;
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // If in local mock mode without secret set, allow fallback for development
  if (!configuredSecret || configuredSecret.includes('change_me')) {
    if (!token) {
      return { authorized: false, reason: 'Missing Authorization header with device secret token' };
    }
    return { authorized: true };
  }

  if (!token) {
    return { authorized: false, reason: 'Authorization header with Bearer token is required' };
  }

  // Constant-time comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(configuredSecret);

  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return { authorized: false, reason: 'Invalid gate device authentication secret' };
  }

  return { authorized: true };
}

export function hashDeviceSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

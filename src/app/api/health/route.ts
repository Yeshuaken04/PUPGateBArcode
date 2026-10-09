import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  let dbStatus = 'disconnected';
  const { searchParams } = new URL(request.url);
  const gateCode = searchParams.get('gate');

  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from('gates').select('count', { count: 'exact', head: true });
    dbStatus = error ? 'error' : 'connected';

    // If gate heartbeat parameter is provided, update gate's last seen time
    if (gateCode && dbStatus === 'connected') {
      await supabase
        .from('gates')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('gate_code', gateCode);
    }
  } catch {
    dbStatus = 'unavailable';
  }

  return NextResponse.json({
    status: 'ok',
    service: 'pup-bataan-gate-system',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

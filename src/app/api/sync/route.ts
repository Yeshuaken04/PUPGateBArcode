import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyDeviceAuth } from '@/lib/gate/security';
import { SyncOfflineEventsSchema } from '@/lib/validation/schemas';

// GET: Download latest student credential deltas to Raspberry Pi local SQLite
export async function GET(request: NextRequest) {
  try {
    const auth = verifyDeviceAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized device' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const supabase = getAdminClient();

    let query = supabase
      .from('students')
      .select('student_number, first_name, last_name, rfid_uid, qr_code, status, updated_at')
      .order('updated_at', { ascending: false });

    if (since) {
      query = query.gt('updated_at', since);
    } else {
      query = query.limit(2500);
    }

    const { data: students, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: students?.length || 0,
      students: students || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Upload offline pending events from Raspberry Pi SQLite queue to Supabase
export async function POST(request: NextRequest) {
  try {
    const auth = verifyDeviceAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized device' }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const parse = SyncOfflineEventsSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid sync payload', details: parse.error }, { status: 400 });
    }

    const { events } = parse.data;
    const supabase = getAdminClient();
    const syncedIds: string[] = [];
    const errors: any[] = [];

    for (const evt of events) {
      try {
        const { data, error } = await supabase.rpc('process_gate_scan', {
          p_credential: evt.credential,
          p_type: evt.type,
          p_gate_code: evt.gate_code,
          p_direction: evt.direction,
          p_device_event_id: evt.device_event_id,
          p_scanned_at: evt.scanned_at,
        });

        if (error) {
          // If RPC is unavailable, perform direct insert
          await supabase.from('access_logs').insert({
            credential_value: evt.credential,
            credential_type: evt.type,
            direction: evt.direction,
            device_event_id: evt.device_event_id,
            result: 'offline',
            scanned_at: evt.scanned_at,
            synced_at: new Date().toISOString(),
          });
        }
        syncedIds.push(evt.device_event_id);
      } catch (e: any) {
        errors.push({ eventId: evt.device_event_id, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedIds.length,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

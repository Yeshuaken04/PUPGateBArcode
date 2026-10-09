import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyDeviceAuth } from '@/lib/gate/security';
import { ScanRequestSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Hardware Device (Raspberry Pi / ESP32)
    const authResult = verifyDeviceAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { allowed: false, action: 'KEEP_CLOSED', reason: authResult.reason || 'UNAUTHORIZED_DEVICE' },
        { status: 401 }
      );
    }

    // 2. Validate Request Body with Zod
    const json = await request.json().catch(() => ({}));
    const parseResult = ScanRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          allowed: false,
          action: 'KEEP_CLOSED',
          reason: 'VALIDATION_ERROR',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { credential, type, gateCode, direction, deviceEventId } = parseResult.data;
    const supabase = getAdminClient();

    // 3. Execute atomic transaction in PostgreSQL via stored function
    const { data, error } = await supabase.rpc('process_gate_scan', {
      p_credential: credential,
      p_type: type,
      p_gate_code: gateCode,
      p_direction: direction,
      p_device_event_id: deviceEventId || null,
    });

    if (error) {
      console.error('[SCAN_RPC_ERROR]', error);

      // Manual fallback query if stored function is not yet installed in Supabase
      const normCred = credential.trim().toUpperCase();
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .or(`rfid_uid.eq.${normCred},qr_code.eq.${normCred},student_number.eq.${normCred}`)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (student) {
        const eventId = deviceEventId || `${gateCode}-${Date.now()}`;
        await supabase.from('access_logs').insert({
          student_id: student.id,
          direction,
          credential_type: type,
          credential_value: normCred,
          result: 'allowed',
          device_event_id: eventId,
        });

        await supabase.from('student_presence').upsert({
          student_id: student.id,
          current_status: direction === 'entry' ? 'inside' : 'outside',
          last_scan_at: new Date().toISOString(),
        });

        return NextResponse.json({
          allowed: true,
          action: 'OPEN',
          result: 'allowed',
          student: {
            id: student.id,
            studentNumber: student.student_number,
            fullName: `${student.first_name} ${student.last_name}`,
            course: student.course,
            status: student.status,
          },
          gate: { code: gateCode, direction },
          deviceEventId: eventId,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        allowed: false,
        action: 'KEEP_CLOSED',
        result: 'denied',
        reason: 'CREDENTIAL_NOT_FOUND',
      });
    }

    // 4. Return Processed Transaction Result
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[SCAN_API_EXCEPTION]', err);
    return NextResponse.json(
      {
        allowed: false,
        action: 'KEEP_CLOSED',
        reason: 'INTERNAL_SERVER_ERROR',
        message: err?.message || 'Server error during scan processing',
      },
      { status: 500 }
    );
  }
}

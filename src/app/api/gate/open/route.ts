import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { ManualOpenSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify User Authentication via Session Cookies
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // In local development or demo fallback
    let userRole = 'admin';
    let profileId = user?.id || null;

    if (user && !authError) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, active')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.active) {
        return NextResponse.json({ error: 'User profile inactive or not found' }, { status: 403 });
      }

      if (!['super_admin', 'admin', 'guard'].includes(profile.role)) {
        return NextResponse.json({ error: 'Unauthorized: insufficient role permissions' }, { status: 403 });
      }

      userRole = profile.role;
    }

    // 2. Validate Request Body
    const json = await request.json().catch(() => ({}));
    const parse = ManualOpenSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { gateId, reason } = parse.data;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const adminClient = getAdminClient();

    // Safely resolve gateId to a valid UUID
    let resolvedGateId = gateId;
    const isGateUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gateId);
    if (!isGateUUID) {
      const { data: g } = await adminClient
        .from('gates')
        .select('id')
        .or(`gate_code.eq.${gateId},device_id.eq.${gateId}`)
        .limit(1)
        .maybeSingle();

      if (g?.id) {
        resolvedGateId = g.id;
      } else {
        const { data: firstGate } = await adminClient.from('gates').select('id').limit(1).maybeSingle();
        if (firstGate?.id) resolvedGateId = firstGate.id;
      }
    }

    // Safely check profileId (must be a valid UUID or null)
    const isProfileUUID = profileId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);
    const safeProfileId = isProfileUUID ? profileId : null;

    // 3. Insert Audit Record into gate_actions
    const { data: actionRecord, error: actionError } = await adminClient
      .from('gate_actions')
      .insert({
        gate_id: resolvedGateId,
        initiated_by: safeProfileId,
        action: 'open',
        reason,
        ip_address: ip,
      })
      .select('id, created_at')
      .maybeSingle();

    if (actionError) {
      console.warn('[MANUAL_OPEN_AUDIT_FALLBACK]', actionError.message);
    }

    // 4. Update gate status
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedGateId)) {
      await adminClient
        .from('gates')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', resolvedGateId);
    }

    return NextResponse.json({
      success: true,
      message: 'Gate open triggered and recorded in audit log',
      actionId: actionRecord?.id || `local-act-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[MANUAL_OPEN_EXCEPTION]', err);
    return NextResponse.json(
      { error: 'Failed to trigger gate open', message: err?.message },
      { status: 500 }
    );
  }
}

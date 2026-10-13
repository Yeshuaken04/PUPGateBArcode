import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { VehicleFormSchema } from '@/lib/validation/schemas';
import { isValidUUID } from '@/lib/utils';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, student:students(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_VEHICLES_ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { id, ...dataToValidate } = json;

    const validationResult = VehicleFormSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validData = validationResult.data;
    const supabase = getAdminClient();

    let targetStudentId = validData.student_id;
    if (!isValidUUID(targetStudentId)) {
      const { data: realStudent } = await supabase
        .from('students')
        .select('id')
        .eq('student_number', targetStudentId)
        .maybeSingle();

      if (realStudent?.id) {
        targetStudentId = realStudent.id;
      } else {
        return NextResponse.json(
          { error: 'Student profile not found in database.' },
          { status: 404 }
        );
      }
    }

    const payload = {
      student_id: targetStudentId,
      plate_number: validData.plate_number.toUpperCase().trim(),
      brand_model: validData.brand_model.trim(),
      vehicle_type: validData.vehicle_type,
      color: validData.color ? validData.color.trim() : null,
      is_active: true,
    };

    if (id && isValidUUID(id)) {
      const { data, error } = await supabase
        .from('vehicles')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data });
    } else {
      const { data, error } = await supabase
        .from('vehicles')
        .upsert(payload, { onConflict: 'plate_number' })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { error } = await supabase.from('vehicles').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

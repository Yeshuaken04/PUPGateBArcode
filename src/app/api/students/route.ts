import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { StudentFormSchema } from '@/lib/validation/schemas';
import { isValidUUID } from '@/lib/utils';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('students')
      .select('*, vehicles(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_STUDENTS_ERROR]', error);
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
    const { id, vehicle, delete_vehicle_id, ...dataToValidate } = json;

    const validationResult = StudentFormSchema.safeParse(dataToValidate);
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

    const payload = {
      student_number: validData.student_number,
      first_name: validData.first_name,
      middle_name: validData.middle_name,
      last_name: validData.last_name,
      person_type: validData.person_type,
      department: validData.department,
      course: validData.course,
      year_level: validData.year_level,
      section: validData.section,
      contact_number: validData.contact_number,
      rfid_uid: validData.rfid_uid,
      qr_code: validData.qr_code,
      status: validData.status,
    };

    let savedStudent: any = null;

    if (id && isValidUUID(id)) {
      const { data, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[STUDENT_UPDATE_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      savedStudent = data;
    } else {
      // Check existing by student_number
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('student_number', payload.student_number)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('[STUDENT_UPDATE_BY_NUM_ERROR]', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        savedStudent = data;
      } else {
        const { data, error } = await supabase
          .from('students')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('[STUDENT_INSERT_ERROR]', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        savedStudent = data;
      }
    }

    // Handle Vehicle pass if provided or requested to delete
    if (savedStudent?.id) {
      if (delete_vehicle_id && isValidUUID(delete_vehicle_id)) {
        await supabase.from('vehicles').delete().eq('id', delete_vehicle_id);
      }

      if (vehicle && vehicle.plate_number && vehicle.plate_number.trim()) {
        const vehiclePayload = {
          student_id: savedStudent.id,
          plate_number: vehicle.plate_number.toUpperCase().trim(),
          brand_model: (vehicle.brand_model || 'Unspecified').trim(),
          vehicle_type: vehicle.vehicle_type || 'motorcycle',
          color: vehicle.color ? vehicle.color.trim() : null,
          is_active: true,
        };

        if (vehicle.id && isValidUUID(vehicle.id)) {
          await supabase.from('vehicles').update(vehiclePayload).eq('id', vehicle.id);
        } else {
          await supabase
            .from('vehicles')
            .upsert(vehiclePayload, { onConflict: 'plate_number' });
        }
      }
    }

    // Return the updated student record with vehicles
    const { data: fullRecord } = await supabase
      .from('students')
      .select('*, vehicles(*)')
      .eq('id', savedStudent.id)
      .single();

    return NextResponse.json({ success: true, data: fullRecord || savedStudent });
  } catch (err: any) {
    console.error('[STUDENT_API_ERROR]', err);
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

    // Check if valid UUID or student_number
    if (isValidUUID(id)) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from('students').delete().eq('student_number', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { StudentFormSchema } from '@/lib/validation/schemas';
import { isValidUUID } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { id, ...dataToValidate } = json;

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

      return NextResponse.json({ success: true, data });
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

        return NextResponse.json({ success: true, data });
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

        return NextResponse.json({ success: true, data });
      }
    }
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

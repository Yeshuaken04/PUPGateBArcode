import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { students, vehicles } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'No valid student records received.' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Upsert students in batches of 50
    const BATCH_SIZE = 50;
    const upsertedStudents: { id: string; student_number: string }[] = [];

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const chunk = students.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('students')
        .upsert(chunk, { onConflict: 'student_number' })
        .select('id, student_number');

      if (error) {
        console.error('[BULK_UPLOAD_STUDENTS_ERROR]', error);
        return NextResponse.json(
          { error: `Database Error (Students): ${error.message}` },
          { status: 500 }
        );
      }

      if (data) {
        upsertedStudents.push(...data);
      }
    }

    // 2. Auto-link and upsert vehicles if provided
    let upsertedVehiclesCount = 0;
    if (Array.isArray(vehicles) && vehicles.length > 0 && upsertedStudents.length > 0) {
      const vehiclePayload: any[] = [];

      for (const v of vehicles) {
        const matched = upsertedStudents.find(
          (s) => s.student_number === v.student_number
        );
        if (matched?.id && v.plate_number) {
          vehiclePayload.push({
            student_id: matched.id,
            plate_number: v.plate_number.toUpperCase().trim(),
            brand_model: v.vehicle_model?.trim() || 'Campus Vehicle',
            vehicle_type: v.vehicle_type || 'motorcycle',
            is_active: true,
          });
        }
      }

      if (vehiclePayload.length > 0) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .upsert(vehiclePayload, { onConflict: 'plate_number' });

        if (vehicleError) {
          console.warn('[BULK_UPLOAD_VEHICLES_WARN]', vehicleError.message);
        } else {
          upsertedVehiclesCount = vehiclePayload.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      studentsCount: upsertedStudents.length,
      vehiclesCount: upsertedVehiclesCount,
    });
  } catch (err: any) {
    console.error('[BULK_UPLOAD_SERVER_ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Server error during bulk upload.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily'; // 'daily' | 'weekly' | 'monthly' | 'all'

    const supabase = getAdminClient();

    // 1. Student counts
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('person_type', 'student');

    const { count: facultyCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('person_type', 'faculty');

    const { count: visitorCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('person_type', 'visitor');

    // 2. Vehicle count
    const { count: vehicleCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    // 3. Current inside count
    const { count: presenceInside } = await supabase
      .from('student_presence')
      .select('*', { count: 'exact', head: true })
      .eq('current_status', 'inside');

    // 4. Today's start in local/UTC
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    let periodStart = todayStart;
    if (period === 'weekly') {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    const { count: entriesToday } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'entry')
      .gte('scanned_at', periodStart.toISOString());

    const { count: exitsToday } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'exit')
      .gte('scanned_at', periodStart.toISOString());

    const { count: deniedToday } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('result', 'denied')
      .gte('scanned_at', periodStart.toISOString());

    // 5. Total scans in database
    const { count: totalScans } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true });

    const { count: allowedScans } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('result', 'allowed');

    // 6. Fetch logs for hourly aggregation in period
    const { data: logsData } = await supabase
      .from('access_logs')
      .select('scanned_at, direction, result')
      .gte('scanned_at', periodStart.toISOString())
      .order('scanned_at', { ascending: true })
      .limit(1000);

    // Build hourly buckets (06 AM to 08 PM)
    const hours = ['06 AM', '07 AM', '08 AM', '09 AM', '10 AM', '11 AM', '12 PM', '01 PM', '02 PM', '03 PM', '04 PM', '05 PM', '06 PM', '07 PM', '08 PM'];
    const hourlyMap: Record<string, { label: string; entries: number; exits: number; denied: number }> = {};
    for (const h of hours) {
      hourlyMap[h] = { label: h, entries: 0, exits: 0, denied: 0 };
    }

    if (logsData && logsData.length > 0) {
      for (const log of logsData) {
        const d = new Date(log.scanned_at);
        const h24 = d.getHours();
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 || 12;
        const formattedHour = `${String(h12).padStart(2, '0')} ${ampm}`;

        if (hourlyMap[formattedHour]) {
          if (log.result === 'denied') {
            hourlyMap[formattedHour].denied += 1;
          } else if (log.direction === 'entry') {
            hourlyMap[formattedHour].entries += 1;
          } else if (log.direction === 'exit') {
            hourlyMap[formattedHour].exits += 1;
          }
        }
      }
    }

    const hourlyDistribution = Object.values(hourlyMap);

    const safeTotal = totalScans || 0;
    const safeAllowed = allowedScans || 0;
    const approvalRate = safeTotal > 0 ? ((safeAllowed / safeTotal) * 100).toFixed(1) : '100.0';

    return NextResponse.json({
      success: true,
      data: {
        studentCount: studentCount || 0,
        facultyCount: facultyCount || 0,
        visitorCount: visitorCount || 0,
        vehicleCount: vehicleCount || 0,
        insideCount: presenceInside !== null && presenceInside !== undefined ? presenceInside : Math.max(0, (entriesToday || 0) - (exitsToday || 0)),
        entriesToday: entriesToday || 0,
        exitsToday: exitsToday || 0,
        deniedToday: deniedToday || 0,
        totalScans: safeTotal,
        approvalRate,
        hourlyDistribution,
      },
    });
  } catch (err: any) {
    console.error('[GET_STATS_ERROR]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

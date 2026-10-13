-- ============================================================================
-- PUP BATAAN AUTOMATED GATE SYSTEM - SUPABASE SECURITY LINTER FIXES
-- I-paste at patakbuhin ito sa Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tofarumlqlkpwlrfzhwt/sql/new
-- ============================================================================

-- 1. FIX: Function Search Path Mutable
-- Nilalagyan ng fixed search_path = public ang bawat function upang maiwasan
-- ang search_path hijacking vulnerabilities.
ALTER FUNCTION public.current_user_role() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.process_gate_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) SET search_path = public;


-- 2. FIX: Public / Signed-In Users Can Execute SECURITY DEFINER Function
-- Ang handle_new_user() ay trigger function lamang para sa auth.users.
-- Bawal itong tawagin nang direkta ng anon o regular authenticated users.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Ang process_gate_scan() ay tinatawag lamang ng backend gate API gamit ang service_role.
-- Bawiin ang public at anon execute permissions at panatilihin para sa service_role.
REVOKE EXECUTE ON FUNCTION public.process_gate_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_gate_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_gate_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_gate_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;


-- 3. FIX: RLS Policy Always True (public.access_logs)
-- Pinalitan ang maluwag na 'WITH CHECK (true)' ng mahigpit na role check.
DROP POLICY IF EXISTS "Logs insertable by system or guards" ON public.access_logs;
CREATE POLICY "Logs insertable by system or guards" ON public.access_logs
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_role() IN ('super_admin', 'admin', 'guard')
  );


-- 4. FIX: RLS Policy Always True (public.student_presence)
-- Pinalitan ang maluwag na 'FOR ALL ... USING (true)' ng mahigpit na role check.
DROP POLICY IF EXISTS "Presence modifiable by authenticated users" ON public.student_presence;
CREATE POLICY "Presence modifiable by guards or admin" ON public.student_presence
  FOR ALL TO authenticated USING (
    public.current_user_role() IN ('super_admin', 'admin', 'guard')
  ) WITH CHECK (
    public.current_user_role() IN ('super_admin', 'admin', 'guard')
  );

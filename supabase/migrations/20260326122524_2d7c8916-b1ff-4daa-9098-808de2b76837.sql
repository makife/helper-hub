
CREATE POLICY "No direct access to otp_codes" ON public.otp_codes FOR ALL TO public USING (false);

CREATE OR REPLACE FUNCTION public.admin_apply_sanction(p_report_id uuid, p_action text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r record;
  reported_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Yetkisiz işlem';
  END IF;

  SELECT * INTO r FROM public.user_reports WHERE id = p_report_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Şikayet bulunamadı'; END IF;

  SELECT full_name INTO reported_name FROM public.profiles WHERE user_id = r.reported_id;

  IF p_action = 'warn' THEN
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (r.reported_id, 'sanction_warning',
      'Hesabına uyarı uygulandı',
      'Hakkında yapılan bir şikayet incelendi ve hesabına uyarı verildi. Kurallara aykırı davranışların tekrarı hesabının askıya alınmasına yol açabilir.',
      r.task_id);

  ELSIF p_action = 'suspend' THEN
    UPDATE public.profiles SET is_banned = true WHERE user_id = r.reported_id;
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (r.reported_id, 'sanction_suspended',
      'Hesabın askıya alındı',
      'Hakkında yapılan şikayetler incelendi ve hesabın geçici olarak askıya alındı. İtiraz için destek ile iletişime geçebilirsin.',
      r.task_id);

  ELSIF p_action = 'unsuspend' THEN
    UPDATE public.profiles SET is_banned = false WHERE user_id = r.reported_id;
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (r.reported_id, 'sanction_lifted',
      'Hesabın yeniden aktif',
      'Hesabındaki askı kaldırıldı. Bi'' El At''ı tekrar kullanabilirsin.');

  ELSE
    RAISE EXCEPTION 'Geçersiz yaptırım: %', p_action;
  END IF;

  UPDATE public.user_reports SET status = 'reviewed' WHERE id = p_report_id;

  RETURN 'ok';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_apply_sanction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_apply_sanction(uuid, text) TO authenticated, service_role;
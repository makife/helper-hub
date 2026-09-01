-- Eski trigger'ı kaldır: artık ilk iş tamamlanınca değil, kayıt olunca ödül verilecek.
DROP TRIGGER IF EXISTS tasks_reward_referral ON public.tasks;

-- Yeni fonksiyon: profilde referred_by ilk kez set edilince hem davet edene hem yeni kullanıcıya 1 kredi ver.
CREATE OR REPLACE FUNCTION public.reward_referral_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  referrer uuid;
  already_rewarded boolean;
BEGIN
  IF NEW.referred_by IS NULL OR NEW.referred_by = OLD.referred_by THEN
    RETURN NEW;
  END IF;

  referrer := NEW.referred_by;

  IF referrer = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = referrer) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = NEW.user_id AND kind = 'referral_reward_bonus'
  ) INTO already_rewarded;

  IF already_rewarded THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = referrer;
  UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = NEW.user_id;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (referrer, 1, 'referral_reward', 'Davet ettiğin kullanıcı kaydoldu');

  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (NEW.user_id, 1, 'referral_reward_bonus', 'Davet koduyla kaydolduğun için bonus');

  RETURN NEW;
END;
$function$;

-- Trigger: profiles tablosunda referred_by güncellendiğinde çalışır.
DROP TRIGGER IF EXISTS profiles_reward_referral ON public.profiles;
CREATE TRIGGER profiles_reward_referral
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_referral_on_signup();
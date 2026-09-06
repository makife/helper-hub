// Güven yıldızları: telefon (otomatik) + admin onaylı 4 belge = toplam 5 yıldız.
import { supabase } from "@/integrations/supabase/client";

export const VERIFICATION_BUCKET = "verification-docs";

export type VerificationKind = "id_card" | "selfie" | "criminal_record" | "skill";
export type VerificationStatus = "pending" | "approved" | "rejected";

export type VerificationRequest = {
  id: string;
  user_id: string;
  kind: VerificationKind;
  status: VerificationStatus;
  file_path: string | null;
  review_note: string | null;
  attempts: number;
  reviewed_at: string | null;
  created_at: string;
};

export const VERIFICATION_KINDS: {
  id: VerificationKind;
  label: string;
  description: string;
}[] = [
  { id: "id_card", label: "Kimlik Belgesi", description: "Kimliğinin ön yüzünün net fotoğrafı" },
  { id: "selfie", label: "Kimlikli Selfie", description: "Kimliğini elinde tutarken çektiğin fotoğraf" },
  { id: "criminal_record", label: "Adli Sicil Kaydı", description: "e-Devlet'ten aldığın adli sicil belgesi" },
  { id: "skill", label: "Yetkinlik Belgesi", description: "Ustalık, sertifika ya da diploma belgen" },
];

export const MAX_VERIFICATION_ATTEMPTS = 5;

export const kindLabel = (kind: string) =>
  VERIFICATION_KINDS.find((k) => k.id === kind)?.label ?? kind;

/** Kullanıcının güven yıldızı (0-5). */
export const fetchTrustScore = async (userId: string): Promise<number> => {
  const { data, error } = await supabase.rpc("trust_score", { _user_id: userId });
  if (error || data == null) return 0;
  return Math.max(0, Math.min(5, Number(data)));
};

/** Belgeyi gizli klasöre yükler ve başvuruyu oluşturur/günceller. */
export const submitVerification = async (
  userId: string,
  kind: VerificationKind,
  file: Blob,
): Promise<{ ok: boolean; reason?: string }> => {
  const path = `${userId}/${kind}-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .upload(path, file, { contentType: "image/jpeg", upsert: false });
  if (upErr) return { ok: false, reason: "upload" };

  const { data: existing } = await supabase
    .from("verification_requests")
    .select("id, file_path, attempts, status")
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    if (existing.status === "approved") return { ok: false, reason: "already_approved" };
    if ((existing.attempts ?? 0) >= MAX_VERIFICATION_ATTEMPTS) {
      await supabase.storage.from(VERIFICATION_BUCKET).remove([path]);
      return { ok: false, reason: "too_many_attempts" };
    }
    const { error } = await supabase
      .from("verification_requests")
      .update({ file_path: path })
      .eq("id", existing.id);
    if (error) {
      await supabase.storage.from(VERIFICATION_BUCKET).remove([path]);
      return { ok: false, reason: "save" };
    }
    if (existing.file_path) {
      await supabase.storage.from(VERIFICATION_BUCKET).remove([existing.file_path]);
    }
    return { ok: true };
  }

  const { error } = await supabase
    .from("verification_requests")
    .insert({ user_id: userId, kind, file_path: path, status: "pending" });
  if (error) {
    await supabase.storage.from(VERIFICATION_BUCKET).remove([path]);
    return { ok: false, reason: "save" };
  }
  return { ok: true };
};

/** Belgeyi görüntülemek için kısa ömürlü imzalı bağlantı. */
export const signedDocUrl = async (path: string): Promise<string | null> => {
  const { data } = await supabase.storage.from(VERIFICATION_BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
};

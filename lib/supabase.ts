import { createClient } from "@supabase/supabase-js";

// 서버(Server Component / Server Action)에서만 쓴다. 키는 .env.local 과 Vercel 환경 변수에만 둔다.
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 없습니다.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const BUCKET = "collab-attachments";

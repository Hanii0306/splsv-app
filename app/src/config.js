// Online monitoring (Supabase). Fill these two values from: Supabase → Project Settings → API.
// The publishable/anon key is meant to be public: the database only lets the app CALL lapor_siswa(),
// it cannot read the student list (see supabase/schema.sql). Leave empty to disable reporting.
export const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_KEY || '';

export const APP_VERSION = '1.5.0';

// Supabase Edge Function entry (Deno). Deploy: see supabase/PANDUAN-TUTOR.md.
import { handle } from './handler.js';

Deno.serve((req) => handle(req, Deno.env.toObject(), fetch));

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nqkyrtauzlizwxblkrev.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_TRxXAEd4ulrTuoK4xNikZg_YWSJdk8g"; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ubktqxljyxyornzcyrbl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVia3RxeGxqeXh5b3JuemN5cmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDkxMjksImV4cCI6MjA3NjU4NTEyOX0.74s5ayJZO0DRK7bSuvq-biF7d24jMr6WWHWchFYbNc8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

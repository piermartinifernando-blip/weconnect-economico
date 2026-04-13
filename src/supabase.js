import { createClient } from "@supabase/supabase-js";

const URL = "https://ozlmgitabjmtxjuyhylh.supabase.co";
const KEY = "sb_publishable_Ba5pzlCTgQXz7qDb0B5IzQ_Si07yYr-";

export const supabase = createClient(URL, KEY);

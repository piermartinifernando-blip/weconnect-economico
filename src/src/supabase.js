import { createClient } from '@supabase/supabase-js'

const URL  = 'https://ozlmgitabjmtxjuyhylh.supabase.co'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bG1naXRhYmptdHhqdXloeWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTUyNjEsImV4cCI6MjA4OTgzMTI2MX0.ypCXz0qit5hnNBEkt_iqXccsJDYnf8thraL8K4OtaDU'

export const supabase = createClient(URL, KEY)

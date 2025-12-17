import { createClient } from '@supabase/supabase-js';

// Credenciais do Projeto NEXUS
// Configurado manualmente conforme solicitado
const supabaseUrl = 'https://ystiqbmzljckrskfrapj.supabase.co';

// Usamos a chave pública (publishable) como a chave anônima (anon key)
// Esta chave é segura para uso no front-end (navegador)
const supabaseKey = 'sb_publishable_qSCXXuULa7p3RSlu8U_9Yw_SGTfvdto';

export const supabase = createClient(supabaseUrl, supabaseKey);
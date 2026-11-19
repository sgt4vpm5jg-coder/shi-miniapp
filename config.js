// Настройки подключения. Заполняются один раз после создания проекта Supabase.
// anon key публичный по своей природе: права на запись даёт только вход в админку (RLS в schema.sql).
window.SHI_CONFIG = {
  supabaseUrl: 'https://vqspkcjedbwhjoqgbizh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxc3BrY2plZGJ3aGpvcWdiaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwNDE4MDQsImV4cCI6MjExMDYxNzgwNH0.dYJC2LLT7DyGklmO6Yj20eV5cPNNaYEHPsnkm227W1E',
  bucket: 'media',
  // запасной контакт, если в админке (Настройки) не указан другой
  contactUsername: 'zakaz_sb'
};

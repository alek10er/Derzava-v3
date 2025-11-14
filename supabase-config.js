// Конфигурация Supabase
const SUPABASE_URL = 'https://nvdatlmxtixzbijvjxft.supabase.co'; // Замените на ваш URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52ZGF0bG14dGl4emJpanZqeGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDUyODgsImV4cCI6MjA3ODYyMTI4OH0.Gjiktyasdhyra-uiay2FbcGVfgZ7oVR5q3hLb17IWEs'; // Замените на ваш ключ

// Инициализация Supabase клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase клиент инициализирован');

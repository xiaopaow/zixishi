import './styles.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing application root');
}

root.innerHTML = `
  <div class="route-loading" role="status" aria-live="polite">
    <span class="loading-leaf" aria-hidden="true">栖</span>
    <p>正在连接这一方静室…</p>
  </div>
`;

const buildProjectUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const buildPublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

if (!buildProjectUrl || !buildPublishableKey) {
  try {
    const response = await fetch('/__qishi/runtime-config', {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
      },
    });
    if (response.ok) {
      globalThis.__QISHI_CONFIG__ = await response.json();
    }
  } catch {
    globalThis.__QISHI_CONFIG__ = undefined;
  }
}

await import('./bootstrap');

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function getJwtRole(value: string): string | undefined {
  const parts = value.split('.');
  if (parts.length !== 3) return undefined;

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    );

    return typeof payload.role === 'string'
      ? payload.role
      : undefined;
  } catch {
    return undefined;
  }
}

function validateClientEnv(env: Record<string, string>): void {
  for (const [name, rawValue] of Object.entries(env)) {
    const value = rawValue.trim();

    if (
      value.includes('sb_secret_') ||
      getJwtRole(value) === 'service_role'
    ) {
      // ห้ามใส่ค่าของ key ลงใน error หรือ log
      throw new Error(`SECURITY HALT: Secret key found in ${name}`);
    }
  }

  const key = env.VITE_SUPABASE_ANON_KEY?.trim();

  if (
    env.VITE_FORCE_OFFLINE !== 'true' &&
    key &&
    !key.startsWith('sb_publishable_') &&
    getJwtRole(key) !== 'anon'
  ) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY must be a publishable key or legacy anon key.',
    );
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  validateClientEnv(env);

  const frontendKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (
    command === 'build' &&
    env.VITE_FORCE_OFFLINE !== 'true' &&
    (!env.VITE_SUPABASE_URL?.trim() || !frontendKey)
  ) {
    throw new Error(
      'Missing Supabase configuration. Refusing an accidental offline build.'
    );
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      modulePreload: {
        resolveDependencies: (_filename, deps) => {
          return deps.filter(dep => !dep.includes('vendor-pdf'));
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/jspdf') ||
              id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/html2pdf') ||
              id.includes('node_modules/docx')
            ) {
              return 'vendor-pdf';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/motion')
            ) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-backend';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url({ message: 'VITE_SUPABASE_URL must be a valid URL' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  // Optional: without it the app works normally, only the reminder toggle is hidden.
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),
  VITE_PERSONAL_EMAIL: z.string().email({ message: 'VITE_PERSONAL_EMAIL must be a valid email' }),
  VITE_PERSONAL_PASSWORD: z.string().min(1, 'VITE_PERSONAL_PASSWORD is required'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(
    `Missing or invalid environment variables. Copy .env.example to .env.local and fill in real values:\n${issues}`,
  );
}

export const env = parsed.data;

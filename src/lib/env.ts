import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url({ message: 'VITE_SUPABASE_URL must be a valid URL' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(
    `Missing or invalid environment variables. Copy .env.example to .env.local and fill in real values:\n${issues}`,
  );
}

export const env = parsed.data;

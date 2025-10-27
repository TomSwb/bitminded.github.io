// Minimal type shims so local TypeScript tooling understands Deno runtime and remote modules

declare const Deno: {
	env: { get(name: string): string | undefined }
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
	export function serve(
		handler: (req: Request) => Promise<Response> | Response
	): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
	export const createClient: any
}



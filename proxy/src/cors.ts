export type CorsEnv = { ALLOWED_ORIGINS?: string }

export function allowedOrigins(env: CorsEnv): string[] {
  return (env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
}

export function isAllowedOrigin(origin: string | null, env: CorsEnv): origin is string {
  return Boolean(origin && allowedOrigins(env).includes(origin))
}

export function corsHeaders(origin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  })
}

export function jsonResponse(body: unknown, status: number, origin?: string): Response {
  const headers = origin ? corsHeaders(origin) : new Headers({ Vary: 'Origin' })
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { status, headers })
}

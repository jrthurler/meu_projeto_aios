(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push(["chunks/[root-of-the-server]__0vjn7h_._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/lib/tenant/resolver.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "resolveTenantFromHostname",
    ()=>resolveTenantFromHostname
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [middleware-edge] (ecmascript) <locals>");
;
// Cache em memória para edge runtime (sem Redis disponível no edge)
// TTL de 60s conforme AC5
const cache = new Map();
const CACHE_TTL_MS = 60_000;
function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return entry.data;
}
function setCached(key, data) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS
    });
}
async function resolveTenantFromHostname(hostname) {
    // Normaliza: remove porta (para desenvolvimento local com :3000)
    const host = hostname.split(':')[0].toLowerCase();
    const cached = getCached(host);
    if (cached !== undefined) return cached;
    const supabaseUrl = ("TURBOPACK compile-time value", "https://qyvivlojyriocvighxio.supabase.co");
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase env vars não configuradas');
    }
    // service_role bypassa RLS — necessário para resolver tenants sem contexto
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false
        }
    });
    const baseDomain = ("TURBOPACK compile-time value", "localhost") ?? 'localhost';
    const baseDomainHost = baseDomain.split(':')[0].toLowerCase();
    let result = null;
    if (host === baseDomainHost || host === 'localhost') {
        // Acesso direto ao domínio raiz — sem tenant
        setCached(host, null);
        return null;
    }
    if (host.endsWith(`.${baseDomainHost}`)) {
        // Estratégia 1: resolução por subdomínio (slug.plataforma.com)
        const slug = host.replace(`.${baseDomainHost}`, '');
        const { data } = await supabase.from('tenants').select('id, slug, nome, ativo').eq('slug', slug).single();
        result = data ?? null;
    } else {
        // Estratégia 2: resolução por domínio customizado
        const { data } = await supabase.from('tenants').select('id, slug, nome, ativo').eq('custom_domain', host).single();
        result = data ?? null;
    }
    setCached(host, result);
    return result;
}
}),
"[project]/ [middleware-edge] (unsupported edge import 'crypto', ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.n(__import_unsupported(`crypto`));
}),
"[project]/lib/auth/config.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "handlers",
    ()=>handlers,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/credentials.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [middleware-edge] (ecmascript)");
;
;
;
;
const { handlers, auth, signIn, signOut } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])({
    providers: [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["default"])({
            credentials: {
                email: {
                    label: 'Email',
                    type: 'email'
                },
                senha: {
                    label: 'Senha',
                    type: 'password'
                }
            },
            async authorize (credentials, request) {
                const { email, senha } = credentials;
                // AC1: tenant_id extraído do header injetado pelo middleware — nunca do body/credentials
                const tenant_id = request?.headers?.get('x-tenant-id') ?? null;
                if (!email || !senha || !tenant_id) return null;
                const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://qyvivlojyriocvighxio.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
                    auth: {
                        persistSession: false
                    }
                });
                const { data: user } = await supabase.from('tenant_users').select('id, email, nome, senha_hash, ativo, tenant_id, role').eq('email', email.toLowerCase()).eq('tenant_id', tenant_id).single();
                // AC2: mensagem genérica — não vazar se é email ou senha errada
                if (!user) return null;
                // AC2: tenant inativo → 403 (tratado no authorize retornando null, middleware bloqueia)
                if (!user.ativo) {
                    throw new Error('ACCOUNT_DISABLED');
                }
                const senhaValida = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["default"].compare(senha, user.senha_hash);
                if (!senhaValida) return null;
                return {
                    id: user.id,
                    email: user.email,
                    name: user.nome,
                    tenant_id: user.tenant_id,
                    role: user.role ?? 'customer'
                };
            }
        })
    ],
    callbacks: {
        // AC3: JWT contém tenant_id como claim obrigatório
        async jwt ({ token, user }) {
            if (user) {
                token.tenant_id = user.tenant_id;
                token.role = user.role;
            }
            return token;
        },
        async session ({ session, token }) {
            if (session.user) {
                session.user.tenant_id = token.tenant_id;
                session.user.role = token.role;
            }
            return session;
        }
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60
    },
    cookies: {
        sessionToken: {
            options: {
                httpOnly: true,
                secure: ("TURBOPACK compile-time value", "development") === 'production',
                sameSite: 'lax'
            }
        }
    },
    pages: {
        signIn: '/account/login',
        signOut: '/'
    }
});
}),
"[project]/lib/auth/rate-limit.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkRateLimit",
    ()=>checkRateLimit,
    "resetRateLimit",
    ()=>resetRateLimit
]);
// AC6: Rate limiting in-memory — 5 tentativas por IP em 15 minutos
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
;
const MAX_ATTEMPTS = 5;
const store = new Map();
function checkRateLimit(ip) {
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
        store.set(ip, {
            count: 1,
            resetAt: now + WINDOW_MS
        });
        return {
            allowed: true
        };
    }
    if (entry.count >= MAX_ATTEMPTS) {
        return {
            allowed: false,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000)
        };
    }
    entry.count++;
    return {
        allowed: true
    };
}
function resetRateLimit(ip) {
    store.delete(ip);
}
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tenant$2f$resolver$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/tenant/resolver.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/config.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$rate$2d$limit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/rate-limit.ts [middleware-edge] (ecmascript)");
;
;
;
;
// Rotas excluídas do tenant context (AC6)
const BYPASS_PREFIXES = [
    '/_next/',
    '/favicon.ico',
    '/api/webhooks/'
];
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf)$/;
// Rotas protegidas que exigem autenticação
const PROTECTED_ROUTES = [
    '/api/orders'
];
async function middleware(request) {
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get('host') ?? '';
    // AC6 — Ignorar assets estáticos e rotas excluídas
    if (BYPASS_PREFIXES.some((p)=>pathname.startsWith(p)) || STATIC_EXTENSIONS.test(pathname)) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // AC6: Rate limiting para rota de signin
    if (pathname === '/api/auth/signin') {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
        const { allowed, retryAfter } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$rate$2d$limit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["checkRateLimit"])(ip);
        if (!allowed) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Muitas tentativas. Tente novamente mais tarde.'
            }, {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter)
                }
            });
        }
    }
    // Resolver tenant pelo hostname
    let tenant;
    try {
        tenant = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tenant$2f$resolver$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["resolveTenantFromHostname"])(hostname);
    } catch (err) {
        console.error('[middleware] Erro ao resolver tenant:', err);
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"]('Erro interno ao resolver tenant', {
            status: 500
        });
    }
    // Tenant não encontrado → 404
    if (tenant === null) {
        const url = request.nextUrl.clone();
        url.pathname = '/not-found';
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(url);
    }
    // Tenant inativo → 503
    if (!tenant.ativo) {
        const url = request.nextUrl.clone();
        url.pathname = '/tenant-unavailable';
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(url);
    }
    // AC3 — Injetar x-tenant-id em todas as rotas válidas
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenant.id);
    requestHeaders.set('x-tenant-slug', tenant.slug);
    // AC3: Validar JWT.tenant_id == x-tenant-id em rotas protegidas
    const isProtected = PROTECTED_ROUTES.some((r)=>pathname.startsWith(r));
    if (isProtected) {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["auth"])();
        if (!session?.user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Não autenticado'
            }, {
                status: 401
            });
        }
        const jwtTenantId = session.user.tenant_id;
        if (jwtTenantId !== tenant.id) {
            // AC3: token válido, mas não para este tenant → 403
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Token inválido para este restaurante'
            }, {
                status: 403
            });
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: requestHeaders
        }
    });
}
const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__0vjn7h_._.js.map
module.exports = [
"[project]/lib/cart/store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useCartStore",
    ()=>useCartStore
]);
// lib/cart/store.ts
// AC6: Zustand cart store — pronto para Epic 3 (Checkout)
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
'use client';
;
function calcItemTotal(precoUnitario, customizacoes, quantidade) {
    const adicionais = customizacoes.reduce((acc, op)=>acc + op.preco_adicional, 0);
    return (precoUnitario + adicionais) * quantidade;
}
const useCartStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        items: [],
        tenantSlug: null,
        total: 0,
        itemCount: 0,
        addItem: (payload)=>{
            const preco_total = calcItemTotal(payload.preco_unitario, payload.customizacoes_selecionadas, payload.quantidade);
            const newItem = {
                id: crypto.randomUUID(),
                produto_id: payload.produto_id,
                nome: payload.nome,
                preco_unitario: payload.preco_unitario,
                quantidade: payload.quantidade,
                customizacoes_selecionadas: payload.customizacoes_selecionadas,
                preco_total,
                foto_url: payload.foto_url
            };
            set((state)=>{
                const items = [
                    ...state.items,
                    newItem
                ];
                return {
                    items,
                    total: items.reduce((acc, i)=>acc + i.preco_total, 0),
                    itemCount: items.reduce((acc, i)=>acc + i.quantidade, 0)
                };
            });
        },
        removeItem: (itemId)=>{
            set((state)=>{
                const items = state.items.filter((i)=>i.id !== itemId);
                return {
                    items,
                    total: items.reduce((acc, i)=>acc + i.preco_total, 0),
                    itemCount: items.reduce((acc, i)=>acc + i.quantidade, 0)
                };
            });
        },
        updateQuantity: (itemId, quantidade)=>{
            if (quantidade <= 0) {
                get().removeItem(itemId);
                return;
            }
            set((state)=>{
                const items = state.items.map((item)=>{
                    if (item.id !== itemId) return item;
                    const preco_total = calcItemTotal(item.preco_unitario, item.customizacoes_selecionadas, quantidade);
                    return {
                        ...item,
                        quantidade,
                        preco_total
                    };
                });
                return {
                    items,
                    total: items.reduce((acc, i)=>acc + i.preco_total, 0),
                    itemCount: items.reduce((acc, i)=>acc + i.quantidade, 0)
                };
            });
        },
        clearCart: ()=>set({
                items: [],
                total: 0,
                itemCount: 0
            }),
        // AC6: reseta o carrinho ao trocar de tenant
        setTenantSlug: (slug)=>{
            const current = get().tenantSlug;
            if (current && current !== slug) {
                set({
                    items: [],
                    total: 0,
                    itemCount: 0,
                    tenantSlug: slug
                });
            } else {
                set({
                    tenantSlug: slug
                });
            }
        }
    }));
}),
"[project]/components/cart/CartButton.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CartButton",
    ()=>CartButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
// AC7: botão do carrinho no header com badge de quantidade
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cart$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/cart/store.ts [app-ssr] (ecmascript)");
'use client';
;
;
function CartButton() {
    const itemCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cart$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCartStore"])((s)=>s.itemCount);
    const total = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cart$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCartStore"])((s)=>s.total);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        className: "relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[--color-primary] text-[--color-primary-fg] text-sm font-medium hover:opacity-90 transition-opacity",
        children: [
            "🛒",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "hidden sm:inline",
                children: total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })
            }, void 0, false, {
                fileName: "[project]/components/cart/CartButton.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            itemCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[--color-primary] rounded-full text-xs font-bold flex items-center justify-center border border-[--color-primary]",
                children: itemCount > 9 ? '9+' : itemCount
            }, void 0, false, {
                fileName: "[project]/components/cart/CartButton.tsx",
                lineNumber: 20,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/cart/CartButton.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime;
}),
"[project]/node_modules/zustand/esm/vanilla.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createStore",
    ()=>createStore
]);
const createStoreImpl = (createState)=>{
    let state;
    const listeners = /* @__PURE__ */ new Set();
    const setState = (partial, replace)=>{
        const nextState = typeof partial === "function" ? partial(state) : partial;
        if (!Object.is(nextState, state)) {
            const previousState = state;
            state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
            listeners.forEach((listener)=>listener(state, previousState));
        }
    };
    const getState = ()=>state;
    const getInitialState = ()=>initialState;
    const subscribe = (listener)=>{
        listeners.add(listener);
        return ()=>listeners.delete(listener);
    };
    const api = {
        setState,
        getState,
        getInitialState,
        subscribe
    };
    const initialState = state = createState(setState, getState, api);
    return api;
};
const createStore = (createState)=>createState ? createStoreImpl(createState) : createStoreImpl;
;
}),
"[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "create",
    ()=>create,
    "useStore",
    ()=>useStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/vanilla.mjs [app-ssr] (ecmascript)");
;
;
const identity = (arg)=>arg;
function useStore(api, selector = identity) {
    const slice = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useSyncExternalStore(api.subscribe, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useCallback(()=>selector(api.getState()), [
        api,
        selector
    ]), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useCallback(()=>selector(api.getInitialState()), [
        api,
        selector
    ]));
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useDebugValue(slice);
    return slice;
}
const createImpl = (createState)=>{
    const api = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createStore"])(createState);
    const useBoundStore = (selector)=>useStore(api, selector);
    Object.assign(useBoundStore, api);
    return useBoundStore;
};
const create = (createState)=>createState ? createImpl(createState) : createImpl;
;
}),
];

//# sourceMappingURL=_0yowrhx._.js.map
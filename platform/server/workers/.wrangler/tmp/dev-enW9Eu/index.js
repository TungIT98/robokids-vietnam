var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-K7kOVV/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// index.js
var POCKETBASE_URL = "https://api.robokids.vn";
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};
function handleCORS() {
  return new Response(null, { headers: corsHeaders });
}
__name(handleCORS, "handleCORS");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
__name(jsonResponse, "jsonResponse");
async function parseJsonBody(request) {
  const text = await request.text();
  return JSON.parse(text);
}
__name(parseJsonBody, "parseJsonBody");
async function handleHealthCheck(env) {
  const pbUrl = `${env.POCKETBASE_URL || POCKETBASE_URL}/api/health`;
  try {
    const start = Date.now();
    const response = await fetch(pbUrl);
    const latency = Date.now() - start;
    if (response.ok) {
      return jsonResponse({
        status: "ok",
        service: "robokids-api",
        environment: "cloudflare-workers",
        pocketbase_status: "connected",
        latency: `${latency}ms`,
        worker: "cloudflare-edge"
      });
    } else {
      return jsonResponse({
        status: "degraded",
        service: "robokids-api",
        pocketbase_status: "error",
        error: "PocketBase health check failed"
      }, 503);
    }
  } catch (error) {
    return jsonResponse({
      status: "error",
      service: "robokids-api",
      pocketbase_status: "unreachable",
      error: error.message || "Unknown error"
    }, 503);
  }
}
__name(handleHealthCheck, "handleHealthCheck");
async function handleRegister(request, env) {
  try {
    const body = await parseJsonBody(request);
    const { email, password, passwordConfirm, full_name, role } = body;
    if (!email || !password || !full_name) {
      return jsonResponse({ error: "Email, password, and full_name are required" }, 400);
    }
    if (password !== passwordConfirm) {
      return jsonResponse({ error: "Passwords do not match" }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ error: "Password must be at least 8 characters" }, 400);
    }
    const pbUrl = `${env.POCKETBASE_URL}/api/collections/users/records`;
    const createUserResponse = await fetch(pbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        passwordConfirm,
        full_name,
        role: role || "student",
        emailVisibility: true
      })
    });
    const result = await createUserResponse.json();
    if (!createUserResponse.ok) {
      console.error("PocketBase create user error:", result);
      return jsonResponse({
        error: result.message || result.error || "Registration failed"
      }, createUserResponse.status);
    }
    const loginResponse = await fetch(`${env.POCKETBASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: email, password })
    });
    const loginResult = await loginResponse.json();
    if (loginResponse.ok) {
      return jsonResponse({
        message: "Account created successfully",
        user: {
          id: result.id,
          email: result.email,
          full_name: result.full_name,
          role: result.role
        },
        token: loginResult.token,
        ...loginResult.record ? { record: loginResult.record } : {}
      }, 201);
    }
    return jsonResponse({
      message: "Account created. Please login.",
      user: {
        id: result.id,
        email: result.email,
        full_name: result.full_name,
        role: result.role
      }
    }, 201);
  } catch (error) {
    console.error("Register error:", error);
    return jsonResponse({
      error: "Registration failed",
      message: error.message || "Unknown error"
    }, 500);
  }
}
__name(handleRegister, "handleRegister");
async function handleLogin(request, env) {
  try {
    const body = await parseJsonBody(request);
    const { email, password } = body;
    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }
    const pbUrl = `${env.POCKETBASE_URL}/api/collections/users/auth-with-password`;
    const response = await fetch(pbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: email, password })
    });
    const result = await response.json();
    if (!response.ok) {
      return jsonResponse({
        error: result.message || "Invalid credentials"
      }, 401);
    }
    return jsonResponse({
      user: {
        id: result.record.id,
        email: result.record.email,
        full_name: result.record.full_name,
        role: result.record.role,
        ...result.record
      },
      token: result.token,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.error("Login error:", error);
    return jsonResponse({
      error: "Login failed",
      message: error.message || "Unknown error"
    }, 500);
  }
}
__name(handleLogin, "handleLogin");
var index_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return handleCORS();
    }
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname === "/api/health" && request.method === "GET") {
      return handleHealthCheck(env);
    }
    if (pathname === "/api/auth/register" && request.method === "POST") {
      return handleRegister(request, env);
    }
    if (pathname === "/api/auth/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    return jsonResponse({
      error: "Not Found",
      message: `Route ${request.method} ${pathname} not found`,
      availableRoutes: [
        "GET /api/health",
        "POST /api/auth/register",
        "POST /api/auth/login"
      ]
    }, 404);
  }
};

// ../../../../../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-K7kOVV/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../../../../../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-K7kOVV/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

export const config = { runtime: "edge" };

function cors(headers = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    ...headers,
  };
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }

  const { searchParams } = new URL(req.url);
  let target = searchParams.get("url");

  if (!target) {
    const appId = searchParams.get("app_id");
    const currency = searchParams.get("currency");
    const tradable = searchParams.get("tradable");

    if (appId && currency) {
      const q = new URLSearchParams({ app_id: appId, currency });
      if (tradable) q.set("tradable", tradable);
      target = `https://api.skinport.com/v1/items?${q.toString()}`;
    }
  }

  if (!target) {
    return new Response(
      JSON.stringify({ error: "Missing 'url' or (app_id + currency)" }),
      { status: 400, headers: cors({ "content-type": "application/json" }) }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(target, {
      method: "GET",
      headers: {
        accept: "application/json",
        "accept-encoding": "identity",
        "user-agent": "Mozilla/5.0 (compatible; Vercel-Edge-Proxy/1.0)",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);

    const text = await resp.text();
    const ct = resp.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      return new Response(text, {
        status: resp.status,
        headers: cors({ "content-type": "application/json; charset=utf-8" }),
      });
    }

    return new Response(JSON.stringify({ raw: text }), {
      status: resp.status,
      headers: cors({ "content-type": "application/json; charset=utf-8" }),
    });
  } catch (err) {
    clearTimeout(timer);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: cors({ "content-type": "application/json" }),
    });
  }
}

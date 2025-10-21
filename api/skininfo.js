export const config = { runtime: "edge" };

/**
 * Petit helper CORS (GET uniquement)
 */
function cors(headers = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    ...headers,
  };
}

/**
 * GET /api/skininfo?market_hash_name=AK-47 Redline (Field-Tested)
 *
 * Retourne un objet:
 * {
 *   name, price, currency, source, image, raw
 * }
 */
export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const marketHashName = searchParams.get("market_hash_name");

    if (!marketHashName) {
      return new Response(
        JSON.stringify({ error: "Missing 'market_hash_name' query param" }),
        { status: 400, headers: cors({ "content-type": "application/json" }) }
      );
    }

    // ------- 1) On interroge Buff163 (fiable pour les prix) ------
    // Endpoint public de recherche
    const buffUrl = `https://buff.163.com/api/market/goods?game=csgo&page_num=1&search=${encodeURIComponent(
      marketHashName
    )}`;

    // Headers pour éviter Cloudflare "Bot fight"
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://buff.163.com/market/",
      Origin: "https://buff.163.com",
    };

    const res = await fetch(buffUrl, { headers, cache: "no-store" });

    if (!res.ok) {
      // Buff renvoie parfois une page HTML Cloudflare => on remonte un message clair
      const text = await res.text();
      return new Response(
        JSON.stringify({
          error: "Buff request failed",
          status: res.status,
          details: text.slice(0, 500),
        }),
        { status: 502, headers: cors({ "content-type": "application/json" }) }
      );
    }

    const json = await res.json();

    // Structure attendue: { code: "OK"|0|..., data: { items: [...] } } — elle
    // varie un peu selon la route. On normalise.
    const items =
      json?.data?.items ||
      json?.data?.goods_infos ||
      json?.data?.goods_infos?.items ||
      json?.data ||
      [];

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No items found on Buff for that search",
          query: marketHashName,
        }),
        { status: 404, headers: cors({ "content-type": "application/json" }) }
      );
    }

    // On sélectionne l'item le plus proche (match exact en priorité)
    // Buff renvoie parfois des objets légèrement différents selon endpoint (items vs goods_infos)
    const normalized = items.map((it) => {
      // Plusieurs variantes de champs possible
      const name =
        it?.name ||
        it?.market_hash_name ||
        it?.goods_name ||
        it?.goods_info?.name ||
        it?.goods_info?.market_hash_name ||
        "";

      const priceStr =
        it?.sell_min_price ||
        it?.lowest_price ||
        it?.goods_info?.sell_min_price ||
        it?.goods_info?.lowest_price ||
        "0";

      const icon =
        it?.icon_url ||
        it?.img_url ||
        it?.goods_info?.icon_url ||
        it?.goods_info?.img_url ||
        "";

      return {
        name,
        price: Number(priceStr) || 0,
        icon,
        raw: it,
      };
    });

    // Tri: match exact d'abord, sinon par similarité (longueur inverse)
    normalized.sort((a, b) => {
      const exactA =
        a.name.toLowerCase() === marketHashName.toLowerCase() ? -1 : 0;
      const exactB =
        b.name.toLowerCase() === marketHashName.toLowerCase() ? -1 : 0;
      if (exactA !== exactB) return exactA - exactB;
      // fallback: place les noms les plus longs devant (souvent plus précis)
      return b.name.length - a.name.length;
    });

    const best = normalized[0];

    // Construire une URL d'image fiable (Buff fournit souvent un icon_url Steam)
    let image = best.icon || "";
    if (image && !image.startsWith("http")) {
      image = `https://steamcommunity-a.akamaihd.net/economy/image/${image}`;
    }

    // Devise : Buff renvoie généralement des prix en CNY
    const result = {
      name: best.name || marketHashName,
      price: best.price,
      currency: "CNY",
      source: "buff163",
      image,
      raw: best.raw, // utile pour debug/évolution
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: cors({ "content-type": "application/json" }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: cors({ "content-type": "application/json" }) }
    );
  }
}

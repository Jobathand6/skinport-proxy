export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const market_hash_name = searchParams.get("market_hash_name");

  if (!market_hash_name) {
    return new Response(JSON.stringify({ error: "Missing market_hash_name" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Proxy relais pour contourner le blocage Cloudflare
  const proxyUrl = "https://api.allorigins.win/get?url=";
  const targetUrl = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(market_hash_name)}`;
  const finalUrl = proxyUrl + encodeURIComponent(targetUrl);

  try {
    const res = await fetch(finalUrl);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Proxy Error ${res.status}` }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();

    // L’API AllOrigins encapsule le vrai contenu dans data.contents
    const parsed = JSON.parse(data.contents);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

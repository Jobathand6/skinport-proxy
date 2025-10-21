export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const market_hash_name = searchParams.get("market_hash_name");

  if (!market_hash_name) {
    return new Response(
      JSON.stringify({ error: "Missing market_hash_name" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ✅ On passe par un proxy public pour contourner le 403
  const targetUrl = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(market_hash_name)}`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(proxyUrl);

    if (!res.ok) {
      throw new Error(`Proxy Error ${res.status}`);
    }

    const data = await res.json();

    // AllOrigins renvoie les vraies données dans "contents"
    const parsed = JSON.parse(data.contents);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

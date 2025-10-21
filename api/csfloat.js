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

  // URL cible
  const targetUrl = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(
    market_hash_name
  )}`;

  // Proxy AllOrigins
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(proxyUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "application/json",
        Referer: "https://csfloat.com/",
      },
    });

    if (!res.ok) {
      throw new Error(`Proxy Error ${res.status}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
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

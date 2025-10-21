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

  const apiUrl = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(market_hash_name)}`;

  try {
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://csfloat.com/",
        "Origin": "https://csfloat.com",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `API Error ${res.status}`, details: text }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

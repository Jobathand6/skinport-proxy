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

  const apiUrl = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(market_hash_name)}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`API Error ${res.status}`);
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

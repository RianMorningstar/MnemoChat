const MNEMO_API_BASE =
  "https://nlnpmdkhcgpybrohmemy.supabase.co/functions/v1/public-api";
const MNEMO_API_KEY = "MV17TgvhqHgg5PC0XKvkBOIlWGM9lMoA";

export async function mnemoFetch<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<{ data: T[]; count: number }> {
  const url = new URL(`${MNEMO_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": MNEMO_API_KEY },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mnemo API error ${res.status}: ${text}`);
  }

  return res.json();
}

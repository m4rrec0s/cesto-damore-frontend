export function getInternalImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  if (typeof window !== "undefined") return url;

  const publicApiUrl = "https://api.cestodamore.com.br";
  const internalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!internalApiUrl) {
    console.warn(
      "⚠️ NEXT_PUBLIC_API_URL não definido - retornando URL original",
    );
    return url;
  }

  if (url.startsWith(publicApiUrl)) {
    return url.replace(publicApiUrl, internalApiUrl);
  }

  return url;
}

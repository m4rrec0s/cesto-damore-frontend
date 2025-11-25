export function getInternalImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  if (typeof window !== "undefined") return url;

  const publicApiUrl = "https://api.cestodamore.com.br";
  const internalApiUrl = "http://localhost:3333";

  if (url.startsWith(publicApiUrl)) {
    return url.replace(publicApiUrl, internalApiUrl);
  }

  return url;
}

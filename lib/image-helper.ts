export function getInternalImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  if (typeof window !== "undefined") return url;

  const publicApiUrl = "https://api.cestodamore.com.br";
  // Em development usa localhost:3333, em production/docker usa cestodamore_api:3333
  const internalApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

  if (url.startsWith(publicApiUrl)) {
    return url.replace(publicApiUrl, internalApiUrl);
  }

  return url;
}

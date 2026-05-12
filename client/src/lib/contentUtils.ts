export function estimateReadingMinutes(text?: string | null) {
  if (!text) return 1;
  const plainText = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const koreanChars = (plainText.match(/[가-힣]/g) ?? []).length;
  const latinWords = (plainText.match(/[A-Za-z0-9]+/g) ?? []).length;
  const estimatedUnits = Math.max(latinWords, Math.ceil(koreanChars / 2));
  return Math.max(1, Math.ceil(estimatedUnits / 450));
}

export function formatContentDate(value?: string | Date | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatLongContentDate(value?: string | Date | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getAccessLabel(accessLevel?: string | null) {
  return accessLevel === "paid" ? "프리미엄" : "무료";
}

export function getContentTypeLabel(contentType?: string | null) {
  return contentType === "video" ? "영상" : "아티클";
}

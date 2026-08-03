import type { DeliveryWindow } from "../hooks/use-cart";

export type SpecialDeliveryTime = "full" | "morning" | "afternoon";

export interface SpecialDeliveryDay {
  day: string;
  time?: SpecialDeliveryTime;
  start?: string;
  end?: string;
}

export const SPECIAL_DELIVERY_DAYS_ENV = "NEXT_PUBLIC_SPECIAL_DELIVERY_DAYS";

export const DEFAULT_WEEKDAY_WINDOWS: DeliveryWindow[] = [
  { start: "09:00", end: "13:00" },
  { start: "14:00", end: "18:00" },
];

export const DEFAULT_WEEKEND_WINDOWS: DeliveryWindow[] = [
  { start: "09:00", end: "13:00" },
];

export function parseSpecialDeliveryDays(raw?: string): SpecialDeliveryDay[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SpecialDeliveryDay =>
        !!entry &&
        typeof entry === "object" &&
        typeof entry.day === "string",
    );
  } catch {
    return [];
  }
}

export function isSpecialDeliveryDay(date?: Date | null): boolean {
  if (!date) return false;
  const specials = parseSpecialDeliveryDays(
    process.env[SPECIAL_DELIVERY_DAYS_ENV],
  );
  if (!specials.length) return false;
  const dateKey = getDateKey(date);
  return specials.some((s) => normalizeDay(s.day) === dateKey);
}

export function getSpecialDeliveryWindows(
  date?: Date | null,
): DeliveryWindow[] | null {
  if (!date) return null;
  const specials = parseSpecialDeliveryDays(
    process.env[SPECIAL_DELIVERY_DAYS_ENV],
  );
  if (!specials.length) return null;
  const dateKey = getDateKey(date);
  const match = specials.find((s) => normalizeDay(s.day) === dateKey);
  if (!match) return null;

  if (match.start && match.end) return [{ start: match.start, end: match.end }];

  switch (match.time) {
    case "morning":
      return [{ start: "09:00", end: "13:00" }];
    case "afternoon":
      return [{ start: "14:00", end: "18:00" }];
    case "full":
    default:
      return DEFAULT_WEEKDAY_WINDOWS;
  }
}

function getDateKey(date: Date): string {
  const str = date.toLocaleString("en-US", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
  const parts = str.split(", ");
  if (parts.length < 2) {
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${m}-${d}`;
  }
  const [month, day, year] = parts[0].split("/").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeDay(day: string): string {
  const trimmed = day.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return trimmed;
}
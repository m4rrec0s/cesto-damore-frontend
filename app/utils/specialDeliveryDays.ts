import type { DeliveryWindow } from "../hooks/use-cart";

export type SpecialDeliveryTime = "full" | "morning" | "afternoon";

export interface SpecialDeliveryDay {
  day: string;
  time?: SpecialDeliveryTime;
  start?: string;
  end?: string;
}

export interface SpecialDeliveryEntry {
  day: string;
  windows: DeliveryWindow[];
}

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

export function normalizeDay(day: string): string {
  const trimmed = day.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return trimmed;
}

export function resolveSpecialWindows(
  config: SpecialDeliveryDay,
): DeliveryWindow[] {
  if (config.start && config.end) {
    return [{ start: config.start, end: config.end }];
  }

  switch (config.time) {
    case "morning":
      return [{ start: "09:00", end: "13:00" }];
    case "afternoon":
      return [{ start: "14:00", end: "18:00" }];
    case "full":
    default:
      return DEFAULT_WEEKDAY_WINDOWS;
  }
}

export function buildSpecialEntries(
  specials: SpecialDeliveryDay[],
): SpecialDeliveryEntry[] {
  return specials.map((s) => ({
    day: normalizeDay(s.day),
    windows: resolveSpecialWindows(s),
  }));
}

export function findSpecialWindows(
  date: Date,
  entries: SpecialDeliveryEntry[],
): DeliveryWindow[] | null {
  const dateKey = getDateKey(date);
  const match = entries.find((e) => e.day === dateKey);
  return match ? match.windows : null;
}

export function isSpecialDeliveryDay(
  date: Date,
  entries: SpecialDeliveryEntry[],
): boolean {
  return findSpecialWindows(date, entries) !== null;
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
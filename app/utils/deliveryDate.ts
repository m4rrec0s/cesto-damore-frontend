export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const saoPauloDateFormatter = new Intl.DateTimeFormat("en-US", {
  calendar: "iso8601",
  day: "2-digit",
  month: "2-digit",
  numberingSystem: "latn",
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
});

const saoPauloDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  calendar: "iso8601",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  numberingSystem: "latn",
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
});

type DateParts = {
  readonly year: string;
  readonly month: string;
  readonly day: string;
};

type DateTimeParts = DateParts & {
  readonly hour: string;
  readonly minute: string;
};

type DeliveryDateForBackendInput = {
  readonly selectedDate: Date | undefined;
  readonly selectedTime: string;
  readonly isToBeArranged: boolean;
};

function formatCalendarDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateParts(date: Date): DateParts | null {
  let year: string | undefined;
  let month: string | undefined;
  let day: string | undefined;

  for (const part of saoPauloDateFormatter.formatToParts(date)) {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
  }

  if (!year || !month || !day) return null;
  return { year, month, day };
}

function getDateTimeParts(date: Date): DateTimeParts | null {
  const dateParts = getDateParts(date);
  if (!dateParts) return null;

  let hour: string | undefined;
  let minute: string | undefined;

  for (const part of saoPauloDateTimeFormatter.formatToParts(date)) {
    if (part.type === "hour") hour = part.value;
    if (part.type === "minute") minute = part.value;
  }

  if (!hour || !minute) return null;
  return { ...dateParts, hour, minute };
}

function createCalendarDate(dateKey: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getSaoPauloDateKey(date: Date): string | null {
  const parts = getDateParts(date);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
}

export function parseStoredDeliveryDate(value: string): Date | null {
  if (DATE_ONLY_PATTERN.test(value)) return createCalendarDate(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const dateKey = getSaoPauloDateKey(date);
  return dateKey ? createCalendarDate(dateKey) : null;
}

export function getLegacyDeliveryTime(value: string): string | null {
  if (DATE_ONLY_PATTERN.test(value)) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return getSaoPauloTime(date);
}

export function getSaoPauloTime(date: Date): string | null {
  const parts = getDateTimeParts(date);
  return parts ? `${parts.hour}:${parts.minute}` : null;
}

export function toSaoPauloSchedulingDate(calendarDate: Date): Date {
  const dateKey = formatCalendarDate(calendarDate);
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12));
  const parts = getDateTimeParts(utcNoon);

  if (!parts) return utcNoon;

  const observedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  const saoPauloOffset = observedAsUtc - utcNoon.getTime();

  return new Date(Date.UTC(year, month - 1, day, 12) - saoPauloOffset);
}

export function getDeliveryDateForBackend({
  selectedDate,
  selectedTime,
  isToBeArranged,
}: DeliveryDateForBackendInput): string | null {
  if (!selectedDate) return null;

  if (!isToBeArranged) {
    const selectedSlot = new Date(selectedTime);
    if (!Number.isNaN(selectedSlot.getTime())) {
      return getSaoPauloDateKey(selectedSlot);
    }
  }

  return formatCalendarDate(selectedDate);
}

export function getPersistedDeliveryDate(calendarDate: Date): string {
  return formatCalendarDate(calendarDate);
}

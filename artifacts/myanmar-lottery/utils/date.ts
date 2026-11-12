function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildLocalDate(year: number, month: number, day: number): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function toDisplayDate(date: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function parseDisplayDate(input: string): Date | null {
  const text = String(input ?? "").trim();
  if (!text) return null;

  const ddMmYyyy = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyy) {
    return buildLocalDate(Number(ddMmYyyy[3]), Number(ddMmYyyy[2]), Number(ddMmYyyy[1]));
  }

  const yyyyMmDd = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDd) {
    return buildLocalDate(Number(yyyyMmDd[1]), Number(yyyyMmDd[2]), Number(yyyyMmDd[3]));
  }

  return null;
}

export function formatDisplayDate(input: string): string {
  const parsed = parseDisplayDate(input);
  return parsed ? toDisplayDate(parsed) : String(input ?? "").trim();
}

export function parseDisplayDateToIso(input: string): string | null {
  const parsed = parseDisplayDate(input);
  return parsed ? toIsoDate(parsed) : null;
}

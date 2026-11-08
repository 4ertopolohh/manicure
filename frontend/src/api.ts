import type { Booking, Content, Selection, Slot } from "./types";
let csrf = "";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken":
        document.cookie.match(/(?:^|; )quietform_csrf=([^;]*)/)?.[1] || csrf,
      ...init?.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Сервер временно недоступен." }));
  if (!response.ok)
    throw new ApiError(
      data.error || "Не удалось выполнить запрос. Попробуйте ещё раз.",
      response.status,
    );
  return data as T;
}
export async function loadContent(signal?: AbortSignal) {
  const c = await request<Content>("content/", { signal });
  csrf = c.csrf;
  return c;
}
export function availability(
  selection: Selection,
  date: string,
  signal: AbortSignal,
) {
  return request<{ slots: Slot[]; price: number; duration: number }>(
    `availability/?service=${selection.service}&options=${selection.options.join(",")}&date=${date}`,
    { signal },
  );
}
export function makeBooking(
  selection: Selection,
  date: string,
  time: string,
  count: number,
) {
  // Contact fields and original files never cross this boundary. Generate independently
  // of their values: no hashes, initials, file names, EXIF or original image bytes.
  return request<Booking>("bookings/", {
    method: "POST",
    body: JSON.stringify({
      ...selection,
      date,
      time,
      reference_count: count,
      guest_name: "Гость " + crypto.randomUUID().slice(0, 6),
      guest_contact: crypto.randomUUID() + "@example.invalid",
    }),
  });
}
export function manageBooking(token: string, action: "lookup" | "cancel") {
  return request<Booking>("bookings/manage/", {
    method: "POST",
    body: JSON.stringify({ token, action }),
  });
}
export const money = (n: number) =>
  new Intl.NumberFormat("ru-RU").format(n) + " ₽";
export const longDate = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

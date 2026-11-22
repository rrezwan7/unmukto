const site = "https://unmukto.invalid";

export function customerReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 512) {
    return "/account/bookings";
  }

  try {
    const url = new URL(value, site);
    if (url.origin === site && /^\/tours\/[^/]+$/.test(url.pathname)) {
      const departure = /^#departure-([1-9]\d{0,9})$/.exec(url.hash)?.[1];
      return departure ? `${url.pathname}?reserve=${departure}${url.hash}` : url.pathname;
    }
  } catch {
    // An invalid return address falls back to the customer's bookings.
  }
  return "/account/bookings";
}

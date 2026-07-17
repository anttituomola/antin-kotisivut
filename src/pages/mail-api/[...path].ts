import type { APIRoute } from "astro";

// Same-origin proxy to the mailing-list service, so the browser never talks
// to the backend directly (no CORS, backend URL stays a server-side env var).
const MAIL_API_URL =
  import.meta.env.MAIL_API_URL || "https://mail.80.69.173.166.sslip.io";

export const ALL: APIRoute = async ({ params, request }) => {
  const path = params.path ?? "";
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const upstream = await fetch(`${MAIL_API_URL}/api/${path}`, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    body,
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
};

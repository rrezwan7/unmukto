import { customerAuth, isCustomerAuthConfigured } from "@/customer-auth";
import type { NextRequest } from "next/server";

function unavailable() {
  return Response.json({ error: "Customer sign-in is not configured." }, {
    status: 503, headers: { "Cache-Control": "no-store" },
  });
}

export function GET(request: NextRequest) {
  return isCustomerAuthConfigured() ? customerAuth.handlers.GET(request) : unavailable();
}

export function POST(request: NextRequest) {
  return isCustomerAuthConfigured() ? customerAuth.handlers.POST(request) : unavailable();
}

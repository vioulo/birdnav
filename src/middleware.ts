import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-url", request.nextUrl.toString());
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

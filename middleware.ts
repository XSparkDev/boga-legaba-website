import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const MAIN_VISITED_COOKIE = "boga-main-visited"
const V2_VISITED_COOKIE = "boga-v2-visited"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/" && !request.cookies.get(MAIN_VISITED_COOKIE)) {
    const url = request.nextUrl.clone()
    url.pathname = "/stay"
    const response = NextResponse.redirect(url)
    response.cookies.set(MAIN_VISITED_COOKIE, "1", {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    })
    return response
  }

  if (pathname === "/v2" && !request.cookies.get(V2_VISITED_COOKIE)) {
    const url = request.nextUrl.clone()
    url.pathname = "/v2/stay"
    const response = NextResponse.redirect(url)
    response.cookies.set(V2_VISITED_COOKIE, "1", {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/v2"],
}

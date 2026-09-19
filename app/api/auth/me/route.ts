import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Token expired or invalid" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: payload,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Session verification failed" }, { status: 500 });
  }
}

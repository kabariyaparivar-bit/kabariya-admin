import { NextResponse } from "next/server";
import { translateText } from "@/lib/translate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text") || "";
    const target = (searchParams.get("target") || "gu") as "gu" | "en";

    if (!text.trim()) {
      return NextResponse.json({ success: true, text: "", translated: "" });
    }

    const translated = await translateText(text, target);
    return NextResponse.json({ success: true, text, translated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Translation failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = (body.text || "").trim();
    const target = (body.target || "gu") as "gu" | "en";

    if (!text) {
      return NextResponse.json({ success: true, text: "", translated: "" });
    }

    const translated = await translateText(text, target);
    return NextResponse.json({ success: true, text, translated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Translation failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid admin session required." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files (JPG, PNG, WebP) are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 1MB limit" },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_CLOUDINARY_CLOUD_NAME || "uzk0o3xc";
    const uploadPreset = process.env.NEXT_CLOUDINARY_UPLOAD_PRESET || "kabariya";

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("upload_preset", uploadPreset);

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: cloudinaryFormData,
      }
    );

    const data = await cloudinaryRes.json();

    if (!cloudinaryRes.ok || !data.secure_url) {
      console.error("[Admin Upload API] Storage error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to upload image to storage" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: true, url: data.secure_url },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Admin Upload API] Internal error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process upload" },
      { status: 500 }
    );
  }
}

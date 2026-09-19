import { NextResponse } from "next/server";
import { comparePassword, createToken, ensureDefaultAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Ensure initial admin exists in MongoDB
    await ensureDefaultAdmin();

    const db = await getDb();
    let adminRecord: any = null;

    if (db) {
      adminRecord = await db.collection("admins").findOne({
        username: username.trim().toLowerCase(),
      });
    }

    // Default admin fallback comparison
    const defaultUser = (process.env.ADMIN_DEFAULT_USERNAME || "admin").toLowerCase();
    const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || "kabariya@admin2026";

    let isValid = false;
    let userInfo = {
      username: username.trim(),
      name: "Kabariya Parivar Admin",
      role: "superadmin",
    };

    if (adminRecord) {
      if (adminRecord.password.startsWith("$2a$") || adminRecord.password.startsWith("$2b$")) {
        isValid = await comparePassword(password, adminRecord.password);
      } else {
        isValid = adminRecord.password === password;
      }
      userInfo = {
        username: adminRecord.username,
        name: adminRecord.name || "Kabariya Parivar Admin",
        role: adminRecord.role || "admin",
      };
    } else if (username.trim().toLowerCase() === defaultUser && password === defaultPass) {
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Issue 60-day token
    const token = createToken(userInfo);

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      token,
      user: userInfo,
      expiresIn: "60d",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Authentication error" },
      { status: 500 }
    );
  }
}

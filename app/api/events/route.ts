import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { EventItem } from "@/lib/types";

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const events = await db
      .collection<EventItem>("events")
      .find({}, { projection: { _id: 0 } })
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id || `evt-${Date.now()}`;

    const newEvent: EventItem = {
      id,
      titleGu: body.titleGu || "",
      titleEn: body.titleEn || body.titleGu || "",
      dateGu: body.dateGu || "",
      dateEn: body.dateEn || body.dateGu || "",
      timeGu: body.timeGu || "",
      timeEn: body.timeEn || body.timeGu || "",
      locationGu: body.locationGu || "સાવરકુંડલા માતાજીના મઢે",
      locationEn: body.locationEn || "Kabariya Parivar Madh, Savarkundla",
      descriptionGu: body.descriptionGu || "",
      descriptionEn: body.descriptionEn || "",
      badgeGu: body.badgeGu || "કાર્યક્રમ",
      badgeEn: body.badgeEn || "Event",
      schedule: body.schedule || [],
      isActive: body.isActive ?? true,
      order: body.order ?? 99,
    };

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    await db.collection("events").updateOne({ id }, { $set: newEvent }, { upsert: true });

    return NextResponse.json({ success: true, message: "Event saved successfully", data: newEvent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save event" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const res = await db.collection("events").deleteOne({ id });

    return NextResponse.json({
      success: res.deletedCount > 0,
      message: res.deletedCount > 0 ? "Event deleted successfully" : "Event not found",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 });
  }
}

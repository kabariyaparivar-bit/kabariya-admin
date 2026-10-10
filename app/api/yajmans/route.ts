import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { YagnaYearRecord, YajmanMember } from "@/lib/types";
import { autoTranslatePair } from "@/lib/translate";

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const records = await db
      .collection<YagnaYearRecord>("yagna_yajmans")
      .find({}, { projection: { _id: 0 } })
      .sort({ year: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch yajmans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await request.json();
    const year = Number(body.year);
    if (!year || isNaN(year)) {
      return NextResponse.json({ error: "Valid year is required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    // Auto-translate Mukhya Yajman items
    const mukhyaYajman: YajmanMember[] = Array.isArray(body.mukhyaYajman)
      ? await Promise.all(
          body.mukhyaYajman.map(async (m: any) => {
            const namePair = await autoTranslatePair(m.nameEn, m.nameGu);
            const villPair = await autoTranslatePair(m.villageEn, m.villageGu);
            return {
              id: m.id || `my-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              nameEn: namePair.en,
              nameGu: namePair.gu,
              villageEn: villPair.en,
              villageGu: villPair.gu,
              phone: m.phone || "",
              note: m.note || "",
            };
          })
        )
      : [];

    // Auto-translate Sah Yajman items
    const sahYajman: YajmanMember[] = Array.isArray(body.sahYajman)
      ? await Promise.all(
          body.sahYajman.map(async (s: any) => {
            const namePair = await autoTranslatePair(s.nameEn, s.nameGu);
            const villPair = await autoTranslatePair(s.villageEn, s.villageGu);
            return {
              id: s.id || `sy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              nameEn: namePair.en,
              nameGu: namePair.gu,
              villageEn: villPair.en,
              villageGu: villPair.gu,
              phone: s.phone || "",
              note: s.note || "",
            };
          })
        )
      : [];

    const now = new Date().toISOString();
    const id = body.id || `yagna-${year}`;

    const newRecord: YagnaYearRecord = {
      id,
      year,
      titleGu: body.titleGu || "શ્રી વાર્ષિક મહાયજ્ઞ મહોત્સવ",
      titleEn: body.titleEn || `Annual Mahayagna Mahotsav ${year}`,
      samvatGu: body.samvatGu || "",
      mukhyaYajman,
      sahYajman,
      isActive: body.isActive ?? true,
      order: body.order ?? 1,
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    await db
      .collection("yagna_yajmans")
      .updateOne({ year }, { $set: newRecord }, { upsert: true });

    return NextResponse.json(
      { success: true, message: "Yagna Yajman year saved successfully", data: newRecord },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save yajmans" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const personId = searchParams.get("personId");
    const personType = searchParams.get("personType"); // "mukhya" | "sah"

    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const yNum = Number(year);

    // If deleting a specific person from a year
    if (personId && personType) {
      const field = personType === "mukhya" ? "mukhyaYajman" : "sahYajman";
      await db.collection("yagna_yajmans").updateOne(
        { year: yNum },
        {
          // @ts-ignore
          $pull: { [field]: { id: personId } },
          $set: { updatedAt: new Date().toISOString() },
        }
      );
      return NextResponse.json({ success: true, message: "Yajman removed successfully" });
    }

    // Delete entire year
    const res = await db.collection("yagna_yajmans").deleteOne({ year: yNum });

    return NextResponse.json({
      success: res.deletedCount > 0,
      message: res.deletedCount > 0 ? "Year deleted successfully" : "Year not found",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}

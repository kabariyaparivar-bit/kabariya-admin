import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { YagnaYearRecord, YajmanMember, YajmanSubMember } from "@/lib/types";
import { autoTranslatePair } from "@/lib/translate";
import path from "path";
import fs from "fs/promises";

const LOCAL_YAJMANS_PATH = path.resolve(process.cwd(), "..", "..", "Kabariya Parivar", "data", "yajmans.json");

async function readFallbackYajmans(): Promise<YagnaYearRecord[]> {
  try {
    const raw = await fs.readFile(LOCAL_YAJMANS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    }
  } catch {
    //
  }
  return [];
}

async function writeFallbackYajmans(data: YagnaYearRecord[]): Promise<void> {
  try {
    await fs.writeFile(LOCAL_YAJMANS_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[yajmans] Failed writing local fallback yajmans.json:", err.message);
  }
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    let records: YagnaYearRecord[] = [];
    try {
      const db = await getDb();
      if (db) {
        records = await db
          .collection<YagnaYearRecord>("yagna_yajmans")
          .find({}, { projection: { _id: 0 } })
          .sort({ year: -1 })
          .toArray();
      }
    } catch (dbErr: any) {
      console.warn("[yajmans] MongoDB GET warning, using local file:", dbErr.message);
    }

    if (!records || records.length === 0) {
      records = await readFallbackYajmans();
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error: any) {
    // Fallback to local file on error
    try {
      const fallback = await readFallbackYajmans();
      if (fallback.length > 0) {
        return NextResponse.json({
          success: true,
          count: fallback.length,
          data: fallback,
        });
      }
    } catch {}

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

    // Auto-translate Mukhya Yajman items
    const mukhyaYajman: YajmanMember[] = Array.isArray(body.mukhyaYajman)
      ? await Promise.all(
          body.mukhyaYajman.map(async (m: any) => {
            const namePair = await autoTranslatePair(m.nameEn, m.nameGu);
            const villPair = await autoTranslatePair(m.villageEn, m.villageGu);

            let subNames: YajmanSubMember[] | undefined = undefined;
            if (Array.isArray(m.names) && m.names.length > 0) {
              subNames = await Promise.all(
                m.names.map(async (sn: any, sIdx: number) => {
                  const sPair = await autoTranslatePair(sn.nameEn, sn.nameGu);
                  return {
                    id: sn.id || `sub-${Date.now()}-${sIdx}`,
                    nameEn: sPair.en,
                    nameGu: sPair.gu,
                    phone: sn.phone || "",
                  };
                })
              );
            }

            return {
              id: m.id || `my-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              nameEn: namePair.en,
              nameGu: namePair.gu,
              villageEn: villPair.en,
              villageGu: villPair.gu,
              phone: m.phone || "",
              note: m.note || "",
              names: subNames,
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

            let subNames: YajmanSubMember[] | undefined = undefined;
            if (Array.isArray(s.names) && s.names.length > 0) {
              subNames = await Promise.all(
                s.names.map(async (sn: any, sIdx: number) => {
                  const sPair = await autoTranslatePair(sn.nameEn, sn.nameGu);
                  return {
                    id: sn.id || `sub-${Date.now()}-${sIdx}`,
                    nameEn: sPair.en,
                    nameGu: sPair.gu,
                    phone: sn.phone || "",
                  };
                })
              );
            }

            return {
              id: s.id || `sy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              nameEn: namePair.en,
              nameGu: namePair.gu,
              villageEn: villPair.en,
              villageGu: villPair.gu,
              phone: s.phone || "",
              note: s.note || "",
              names: subNames,
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

    // Save to MongoDB if available
    try {
      const db = await getDb();
      if (db) {
        await db
          .collection("yagna_yajmans")
          .updateOne({ year }, { $set: newRecord }, { upsert: true });
      }
    } catch (dbErr: any) {
      console.warn("[yajmans] MongoDB update warning:", dbErr.message);
    }

    // Always sync with local file fallback
    const local = await readFallbackYajmans();
    const idx = local.findIndex((y) => Number(y.year) === year || y.id === id);
    if (idx >= 0) {
      local[idx] = newRecord;
    } else {
      local.push(newRecord);
    }
    local.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    await writeFallbackYajmans(local);

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

    const yNum = Number(year);

    // If deleting a specific person from a year
    if (personId && personType) {
      const field = personType === "mukhya" ? "mukhyaYajman" : "sahYajman";
      try {
        const db = await getDb();
        if (db) {
          await db.collection("yagna_yajmans").updateOne(
            { year: yNum },
            {
              // @ts-ignore
              $pull: { [field]: { id: personId } },
              $set: { updatedAt: new Date().toISOString() },
            }
          );
        }
      } catch (dbErr: any) {
        console.warn("[yajmans] MongoDB person delete warning:", dbErr.message);
      }

      // Sync local file
      const local = await readFallbackYajmans();
      const yrIdx = local.findIndex((y) => Number(y.year) === yNum);
      if (yrIdx >= 0) {
        local[yrIdx][field] = local[yrIdx][field].filter((p) => p.id !== personId);
        local[yrIdx].updatedAt = new Date().toISOString();
        await writeFallbackYajmans(local);
      }

      return NextResponse.json({ success: true, message: "Yajman removed successfully" });
    }

    // Delete entire year
    try {
      const db = await getDb();
      if (db) {
        await db.collection("yagna_yajmans").deleteOne({ year: yNum });
      }
    } catch (dbErr: any) {
      console.warn("[yajmans] MongoDB year delete warning:", dbErr.message);
    }

    // Sync local file
    const local = await readFallbackYajmans();
    const filtered = local.filter((y) => Number(y.year) !== yNum);
    await writeFallbackYajmans(filtered);

    return NextResponse.json({
      success: true,
      message: "Year deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}

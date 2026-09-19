import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { PersonBusiness } from "@/lib/types";

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Valid admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q")?.trim().toLowerCase();
    const status = searchParams.get("status"); // 'all' | 'pending' | 'approved'

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const col = db.collection<PersonBusiness>("businesses");
    let query: any = {};

    if (status === "pending") {
      query.isApproved = { $ne: true };
    } else if (status === "approved") {
      query.isApproved = true;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    let businesses = await col.find(query, { projection: { _id: 0 } }).toArray();

    if (q) {
      businesses = businesses.filter((b) => {
        const p1 = (b.personName || "").toLowerCase();
        const p1g = (b.personNameGu || "").toLowerCase();
        const p2 = (b.personName2 || "").toLowerCase();
        const bn = (b.businessName || "").toLowerCase();
        const bng = (b.businessNameGu || "").toLowerCase();
        const city = (b.city || "").toLowerCase();
        const ph = (b.phone || "");
        const ph2 = (b.phone2 || "");
        return (
          p1.includes(q) ||
          p1g.includes(q) ||
          p2.includes(q) ||
          bn.includes(q) ||
          bng.includes(q) ||
          city.includes(q) ||
          ph.includes(q) ||
          ph2.includes(q)
        );
      });
    }

    return NextResponse.json({
      success: true,
      count: businesses.length,
      data: businesses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch businesses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id || `biz-${Date.now()}`;

    const newBiz: PersonBusiness = {
      id,
      personName: body.personName || body.personNameGu || "",
      personNameGu: body.personNameGu || body.personName || "",
      personName2: body.personName2 || "",
      personName2Gu: body.personName2Gu || "",
      personPhoto: body.personPhoto || "",
      village: body.village || "Savarkundla",
      villageGu: body.villageGu || "સાવરકુંડલા",
      businessName: body.businessName || body.businessNameGu || "",
      businessNameGu: body.businessNameGu || body.businessName || "",
      category: body.category || "other",
      categoryLabelEn: body.categoryLabelEn || "Business",
      categoryLabelGu: body.categoryLabelGu || "વ્યવસાય",
      city: body.city || "Savarkundla",
      cityGu: body.cityGu || "સાવરકુંડલા",
      state: body.state || "Gujarat",
      stateGu: body.stateGu || "ગુજરાત",
      address: body.address || "",
      addressGu: body.addressGu || "",
      mapUrl: body.mapUrl || "",
      phone: body.phone || "",
      phone2: body.phone2 || "",
      whatsapp: (body.whatsapp || body.phone || "").replace(/\D/g, ""),
      email: body.email || "",
      website: body.website || "",
      images: body.images || "",
      comment: body.comment || "",
      description: body.description || "",
      descriptionGu: body.descriptionGu || "",
      services: body.services || [],
      servicesGu: body.servicesGu || [],
      establishedYear: body.establishedYear || "",
      isActive: body.isActive ?? true,
      isApproved: body.isApproved ?? true,
      createdAt: body.createdAt || new Date(),
    };

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    await db.collection("businesses").updateOne({ id }, { $set: newBiz }, { upsert: true });

    return NextResponse.json({ success: true, message: "Business saved successfully", data: newBiz }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save business" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await request.json();
    const { id, isApproved, isActive, ...otherUpdates } = body;

    if (!id) {
      return NextResponse.json({ error: "Business ID is required." }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const updateDoc: any = { ...otherUpdates };
    if (typeof isApproved === "boolean") updateDoc.isApproved = isApproved;
    if (typeof isActive === "boolean") updateDoc.isActive = isActive;

    const res = await db.collection("businesses").updateOne({ id }, { $set: updateDoc });

    return NextResponse.json({
      success: true,
      message: res.matchedCount > 0 ? "Business updated successfully" : "Business not found",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update business" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const res = await db.collection("businesses").deleteOne({ id });

    return NextResponse.json({
      success: res.deletedCount > 0,
      message: res.deletedCount > 0 ? "Business deleted successfully" : "Business not found",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete business" }, { status: 500 });
  }
}

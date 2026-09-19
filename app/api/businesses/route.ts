import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { PersonBusiness } from "@/lib/types";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized. Valid admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status"); // 'all' | 'pending' | 'approved'
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection unavailable" }, { status: 500 });
    }

    const col = db.collection<PersonBusiness>("businesses");

    // Concurrently fetch stats for top counters & pill badges
    const [totalAll, totalPending, totalApproved] = await Promise.all([
      col.countDocuments({}),
      col.countDocuments({ isApproved: { $ne: true } }),
      col.countDocuments({ isApproved: true }),
    ]);

    // Build query filter
    const filter: any = {};
    const andConditions: any[] = [];

    if (status === "pending") {
      andConditions.push({ isApproved: { $ne: true } });
    } else if (status === "approved") {
      andConditions.push({ isApproved: true });
    }

    if (category && category !== "all") {
      andConditions.push({ category });
    }

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      andConditions.push({
        $or: [
          { businessName: { $regex: regex } },
          { businessNameGu: { $regex: regex } },
          { personName: { $regex: regex } },
          { personNameGu: { $regex: regex } },
          { personName2: { $regex: regex } },
          { personName2Gu: { $regex: regex } },
          { city: { $regex: regex } },
          { cityGu: { $regex: regex } },
          { village: { $regex: regex } },
          { villageGu: { $regex: regex } },
          { phone: { $regex: regex } },
          { phone2: { $regex: regex } },
          { whatsapp: { $regex: regex } },
          { description: { $regex: regex } },
          { descriptionGu: { $regex: regex } },
          { comment: { $regex: regex } },
        ],
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const total = await col.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    const businesses = await col
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1, businessName: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      count: total,
      data: businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      stats: {
        total: totalAll,
        pending: totalPending,
        approved: totalApproved,
      },
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

import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { BusinessUpdateRequest, PersonBusiness } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid admin session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const col = db.collection<BusinessUpdateRequest>("business_update_requests");

    // Clean up any historical approved/rejected requests so only active pending requests remain
    await col.deleteMany({ status: { $in: ["approved", "rejected"] } });

    const totalPending = await col.countDocuments({});

    const rawRequests = await col
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const requests = rawRequests.map((r: any) => ({
      ...r,
      _id: r._id ? r._id.toString() : r.id,
    }));

    return NextResponse.json({
      success: true,
      data: requests,
      stats: {
        total: totalPending,
        pending: totalPending,
        approved: 0,
        rejected: 0,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch business update requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch update requests" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid admin session required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Missing required fields or invalid action" },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const reqCol = db.collection<BusinessUpdateRequest>("business_update_requests");
    const updateReq = await reqCol.findOne({
      $or: [{ id: requestId }, { _id: requestId as any }],
    });

    if (!updateReq) {
      return NextResponse.json({ error: "Update request not found" }, { status: 404 });
    }

    if (action === "approve") {
      // 1. Apply updated data to the business
      const bizCol = db.collection<PersonBusiness>("businesses");
      const currentBiz = await bizCol.findOne({ id: updateReq.businessId });

      const mergedData: Partial<PersonBusiness> = {
        ...(currentBiz || {}),
        ...updateReq.updatedData,
        id: updateReq.businessId,
        isApproved: true,
        isActive: true,
      };

      delete (mergedData as any)._id;

      await bizCol.updateOne(
        { id: updateReq.businessId },
        { $set: mergedData },
        { upsert: true }
      );

      // 2. Permanently delete request from database (no history retained)
      await reqCol.deleteOne({
        $or: [{ id: updateReq.id }, { _id: (updateReq as any)._id }],
      });

      return NextResponse.json({
        success: true,
        message: "સુધારો મંજૂર (Approved) થયો છે, લાઈવ અપડેટ થઈ ગયો છે અને વિનંતી ડેટાબેઝમાંથી કાઢી નાખવામાં આવી છે.",
      });
    } else {
      // Reject & permanently delete request from database
      await reqCol.deleteOne({
        $or: [{ id: updateReq.id }, { _id: (updateReq as any)._id }],
      });

      return NextResponse.json({
        success: true,
        message: "વિનંતી નામંજૂર (Rejected) કરીને ડેટાબેઝમાંથી કાઢી નાખવામાં આવી છે.",
      });
    }
  } catch (error: any) {
    console.error("Failed to process business update request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process update request" },
      { status: 500 }
    );
  }
}

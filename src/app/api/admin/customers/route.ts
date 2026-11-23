import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { adminCustomerCreateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || searchParams.get("search") || "")
      .trim()
      .toLowerCase();
    const sort = (searchParams.get("sort") || "newest").trim().toLowerCase();
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );

    let customers = await prisma.customer.findMany({
      include: {
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (q) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email ? c.email.toLowerCase().includes(q) : false) ||
          (c.city ? c.city.toLowerCase().includes(q) : false)
      );
    }

    if (sort === "spent_desc") {
      customers.sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent));
    } else if (sort === "orders_desc") {
      customers.sort((a, b) => Number(b.totalOrders) - Number(a.totalOrders));
    } else if (sort === "name_asc") {
      customers.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      customers.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const total = customers.length;
    const paginated = customers.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      customers: paginated,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error("[Admin Customers GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const parsed = adminCustomerCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.customer.findUnique({
      where: { phone: data.phone },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Customer with this phone already exists" },
        { status: 409 }
      );
    }

    const created = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        city: data.city || null,
        address: data.address || null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        customer: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Admin Customers POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

import { Prisma } from "@prisma/client";
import prisma, { MOCK_PRODUCTS } from "@/lib/db";

export async function resolveProductForOrder(productId: string) {
  const trimmed = productId.trim();
  const canonical = MOCK_PRODUCTS.find((p) => p.id === trimmed);
  if (canonical) {
    return prisma.product.findFirst({
      where: {
        OR: [{ id: trimmed }, { slug: canonical.slug }],
      },
    });
  }

  return prisma.product.findUnique({
    where: { id: trimmed },
  });
}

export interface PersistOrderLineInput {
  productId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PersistWhatsAppOrderInput {
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: string;
  customerNotes?: string;
  adminNotes?: string;
  status?: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingFee?: number;
  total: number;
  couponCode?: string | null;
  whatsappUrl?: string | null;
  items: PersistOrderLineInput[];
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const tail = String(Date.now()).slice(-5);
  const rand = Math.floor(10 + Math.random() * 90);
  return `CYX-${year}-${tail}${rand}`;
}

export async function persistOrderRecord(
  input: PersistWhatsAppOrderInput
): Promise<{ orderId: string | null; orderNumber: string }> {
  const orderNumber = input.orderNumber || generateOrderNumber();
  const cleanPhone = input.customerPhone?.trim() || "";
  const cleanName = input.customerName?.trim() || "WhatsApp Guest";
  const cleanEmail = input.customerEmail?.trim() || null;
  const cleanAddress = input.shippingAddress?.trim() || null;

  try {
    let customerId: string | null = null;

    if (cleanPhone) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { phone: cleanPhone },
      });
      if (existingCustomer) {
        const updatedCustomer = await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: input.total },
            ...(input.customerName ? { name: cleanName } : {}),
            ...(cleanEmail ? { email: cleanEmail } : {}),
            ...(cleanAddress ? { address: cleanAddress } : {}),
          },
        });
        customerId = updatedCustomer.id;
      } else {
        const createdCustomer = await prisma.customer.create({
          data: {
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            address: cleanAddress,
            totalOrders: 1,
            totalSpent: input.total,
          },
        });
        customerId = createdCustomer.id;
      }
    }

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail,
        shippingAddress: cleanAddress,
        status: input.status || "pending",
        currency: input.currency.toUpperCase(),
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
        shippingFee: input.shippingFee ?? 0,
        total: input.total,
        couponCode: input.couponCode || null,
        whatsappUrl: input.whatsappUrl || null,
        customerNotes: input.customerNotes || null,
        adminNotes: input.adminNotes || null,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      } as Prisma.OrderUncheckedCreateInput,
      include: { items: true },
    });

    if (input.couponCode) {
      try {
        await prisma.coupon.update({
          where: { code: input.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      } catch (couponErr) {
        console.warn("[Order Persistence] Failed to increment coupon usedCount:", couponErr);
      }
    }

    return { orderId: createdOrder.id, orderNumber: createdOrder.orderNumber };
  } catch (err) {
    console.warn("[Order Persistence] Non-fatal persistence error:", err);
    return { orderId: null, orderNumber };
  }
}

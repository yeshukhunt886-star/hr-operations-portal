import { prisma } from "../prisma.js";
import {
  createOrderSchema,
  cancelOrderSchema
} from "../validators/orderValidator.js";

const TAX_RATE = 0.18;
const FREE_SHIPPING_THRESHOLD = 1000;
const STANDARD_SHIPPING_FEE = 100;

function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timestamp}-${random}`;
}

function serializeOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    addressId: order.addressId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shippingFee),
    tax: Number(order.tax),
    total: Number(order.total),
    address: order.address
      ? {
          id: order.address.id,
          fullName: order.address.fullName,
          phone: order.address.phone,
          address1: order.address.address1,
          address2: order.address.address2,
          city: order.address.city,
          state: order.address.state,
          postalCode: order.address.postalCode,
          country: order.address.country
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal)
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export async function createOrder(req, res, next) {
  try {
    const data = createOrderSchema.parse(req.body);
    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: req.user.id },
        include: {
          items: {
            include: { product: true },
            orderBy: { createdAt: "asc" }
          }
        }
      });
      if (!cart || cart.items.length === 0) {
        const error = new Error("Cart is empty");
        error.statusCode = 400;
        throw error;
      }
      let subtotal = 0;
      for (const item of cart.items) {
        if (!item.product) {
          const error = new Error( `Product ${item.productId} no longer exists`);
          error.statusCode = 400;
          throw error;
        }

        if (item.product.status !== "ACTIVE") {
          const error = new Error(`Product "${item.product.name}" is no longer available`);
          error.statusCode = 400;
          throw error;
        }

        if (item.product.stock < item.quantity) {
          const error = new Error( `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}` );
          error.statusCode = 400;
          throw error;
        }
        subtotal += Number(item.product.price) * item.quantity;
      }

      subtotal = Number(subtotal.toFixed(2));
      const tax = Number( (subtotal * TAX_RATE).toFixed(2) );

      const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD
                        ? 0
                        : STANDARD_SHIPPING_FEE;

      const total = Number( (subtotal + tax + shippingFee).toFixed(2) );
      const address = await tx.address.create({
        data: {
          userId: req.user.id,
          fullName: data.shippingAddress.fullName,
          phone: data.shippingAddress.phone,
          address1: data.shippingAddress.address1,
          address2: data.shippingAddress.address2 || null,
          city: data.shippingAddress.city,
          state: data.shippingAddress.state,
          postalCode: data.shippingAddress.postalCode,
          country: data.shippingAddress.country
        }
      });
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: req.user.id,
          addressId: address.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          shippingFee,
          tax,
          total
        }
      });
      for (const item of cart.items) {
        const lineTotal = Number( (Number(item.product.price) * item.quantity).toFixed(2) );
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            status: "ACTIVE",
            stock: { gte: item.quantity}
          },
          data: { stock: { decrement: item.quantity } }
        });

        if (stockUpdate.count !== 1) {
          const error = new Error(`Unable to reserve stock for "${item.product.name}". Please try again.` );
          error.statusCode = 400;
          throw error;
        }
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.productId,
            productName: item.product.name,
            unitPrice: item.product.price,
            quantity: item.quantity,
            lineTotal
          }
        });
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          address: true,
          items: {
            orderBy: { id: "asc"}
          }
        }
      });
    });
    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: serializeOrder(order)
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function getOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id},
      include: {
        address: true,
        items: {
          orderBy: { id: "asc" }
        }
      },
      orderBy: {createdAt: "desc"}
    });
    return res.json({
      success: true,
      data: orders.map(serializeOrder)
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id
      },
      include: {
        address: true,
        items: {
          orderBy: { id: "asc" }
        }
      }
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    return res.json({
      success: true,
      data: serializeOrder(order)
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    const data = cancelOrderSchema.parse(req.body || {});
    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
        where: {id: orderId,userId: req.user.id},
        include: {items: true}
      });
      if (!existingOrder) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }
      if (!["PENDING", "CONFIRMED"].includes( existingOrder.status )) {
        const error = new Error( `Order cannot be cancelled when status is ${existingOrder.status}`);
        error.statusCode = 400;
        throw error;
      }
      const updatedOrder = await tx.order.update({
        where: { id: existingOrder.id},
        data: { status: "CANCELLED" }
      });
      for (const item of existingOrder.items) {
        await tx.product.update({
          where: {
            id: item.productId
          },
          data: {
            stock: { increment: item.quantity }
          }
        });
      }
      return tx.order.findUnique({
        where: { id: updatedOrder.id },
        include: {
          address: true,
          items: {
            orderBy: { id: "asc" }
          }
        }
      });
    });
    return res.json({
      success: true,
      message: data.reason
        ? `Order cancelled successfully. Reason: ${data.reason}`
        : "Order cancelled successfully",
      data: serializeOrder(order)
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}
import { prisma } from "../prisma.js";
import {
  paymentSchema,
  refundSchema
} from "../validators/paymentValidator.js";

export async function payOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    const data = paymentSchema.parse(req.body);
    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
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
      if (!existingOrder) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }
      if (existingOrder.status === "CANCELLED") {
        const error = new Error("Cancelled orders cannot be paid");
        error.statusCode = 400;
        throw error;
      }
      if (existingOrder.status === "DELIVERED") {
        const error = new Error("Delivered orders do not require payment");
        error.statusCode = 400;
        throw error;
      }
      if (existingOrder.paymentStatus === "PAID") {
        const error = new Error( "Order has already been paid" );
        error.statusCode = 400;
        throw error;
      }
      if (existingOrder.paymentStatus === "REFUNDED") {
        const error = new Error( "Refunded order cannot be paid again" );
        error.statusCode = 400;
        throw error;
      }
      if (data.paymentMethod === "COD") {
        const error = new Error(  "COD payment is not supported in this payment demo" );
        error.statusCode = 400;
        throw error;
      }
      const updatedOrder = await tx.order.update({
        where: {id: existingOrder.id },
        data: {
          paymentStatus: "PAID",
          status:
            existingOrder.status === "PENDING"
              ? "CONFIRMED"
              : existingOrder.status
        },
        include: {
          address: true,
          items: {
            orderBy: {
              id: "asc"
            }
          }
        }
      });
      return updatedOrder;
    });
    return res.json({
      success: true,
      message: "Payment completed successfully",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: data.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        amount: Number(order.total),
        paidAt: new Date().toISOString()
      }
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

export async function getPaymentStatus(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
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
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        updatedAt: true
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
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        amount: Number(order.total),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function refundOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    const data = refundSchema.parse(req.body || {});
    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
        where: {
          id: orderId,
          userId: req.user.id
        }
      });
      if (!existingOrder) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }
      if (existingOrder.paymentStatus !== "PAID") {
        const error = new Error("Only paid orders can be refunded");
        error.statusCode = 400;
        throw error;
      }
      const updatedOrder = await tx.order.update({
        where: {id: existingOrder.id},
        data: {
          paymentStatus: "REFUNDED",
          status: "CANCELLED"
        }
      });
      return updatedOrder;
    });
    return res.json({
      success: true,
      message: data.reason
        ? `Payment refunded successfully. Reason: ${data.reason}`
        : "Payment refunded successfully",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        refundAmount: Number(order.total),
        refundedAt: new Date().toISOString()
      }
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
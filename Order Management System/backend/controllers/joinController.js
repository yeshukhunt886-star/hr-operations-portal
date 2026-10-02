import { User, Order, Product, OrderItem, Payment } from "../models/index.js";

// Users with Orders
export const getUsersWithOrders = async (req, res) => {
  try {
    const data = await User.findAll({
      include: Order
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Order Details (FIXED)
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const data = await Order.findOne({
      where: { id: orderId },
      include: [
        {
          model: OrderItem,
          include: [Product]
        },
        Payment
      ]
    });

    if (!data) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
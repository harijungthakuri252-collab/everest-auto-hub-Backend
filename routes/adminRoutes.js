const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Service = require('../models/Service');
const Review = require('../models/Review');
const { protect, adminOnly } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [users, appointments, orders, products] = await Promise.all([
      User.countDocuments({ role: 'user', isVerified: true }),
      Appointment.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments({ isActive: true }),
    ]);

    // Revenue from DELIVERED orders only
    const orderRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    // Revenue from COMPLETED appointments (sum service prices)
    const completedAppointments = await Appointment.find({ status: 'completed' })
      .populate('service', 'price');
    const appointmentRevenue = completedAppointments.reduce(
      (sum, a) => sum + (a.service?.price || 0), 0
    );

    const totalRevenue = (orderRevenue[0]?.total || 0) + appointmentRevenue;

    // Monthly revenue for chart (last 6 months) — delivered orders
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyOrders = await Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyData = monthlyOrders.map(m => ({
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      revenue: m.revenue,
      orders: m.orders,
    }));

    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    res.json({
      users,
      appointments,
      orders,
      products,
      revenue: totalRevenue,
      orderRevenue: orderRevenue[0]?.total || 0,
      appointmentRevenue,
      pendingAppointments,
      pendingOrders,
      monthlyData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Notification counts for admin topbar badges
router.get('/notification-counts', protect, adminOnly, async (req, res) => {
  try {
    const [pendingOrders, pendingAppointments, pendingReviews, recentOrdersList, recentApptList, recentReviewsList] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'pending' }),
      Review.countDocuments({ isApproved: false }),
      Order.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).select('shippingAddress totalPrice createdAt'),
      Appointment.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).populate('service', 'name').select('name service date timeSlot createdAt'),
      Review.find({ isApproved: false }).sort({ createdAt: -1 }).limit(5).select('name rating comment createdAt'),
    ]);

    const recent = [
      ...recentOrdersList.map(o => ({ type: 'order', icon: '🛒', title: `New order from ${o.shippingAddress?.name || 'Customer'}`, sub: `$${o.totalPrice?.toFixed(2)}`, time: o.createdAt, link: '/admin/orders' })),
      ...recentApptList.map(a => ({ type: 'appointment', icon: '📅', title: `Appointment: ${a.name}`, sub: `${a.service?.name || 'Service'} — ${a.timeSlot}`, time: a.createdAt, link: '/admin/appointments' })),
      ...recentReviewsList.map(r => ({ type: 'review', icon: '⭐', title: `New review from ${r.name}`, sub: `${r.rating}/5 — "${r.comment?.slice(0, 40)}..."`, time: r.createdAt, link: '/admin/reviews' })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    res.json({
      counts: { pendingOrders, pendingAppointments, pendingReviews },
      recent,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users — only verified users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ isVerified: true }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

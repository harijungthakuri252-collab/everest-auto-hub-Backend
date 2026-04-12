const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const { protect, adminOnly } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// ─── Helpers ────────────────────────────────────────────────────────────────

const sanitize = (str) => (str ? String(str).replace(/<[^>]*>/g, '').trim() : '');

const sendBookingConfirmation = async (appointment, serviceName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"Everest Auto Hub" <${process.env.EMAIL_USER}>`,
      to: appointment.email,
      subject: 'Appointment Confirmed — Everest Auto Hub',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f8f9fa;padding:40px;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="font-size:26px;font-weight:900;font-style:italic;letter-spacing:3px;margin:0;">
              EVEREST AUTO <span style="background:#f97316;padding:2px 10px;border-radius:6px;">HUB</span>
            </h1>
          </div>
          <h2 style="color:#f97316;margin-bottom:8px;">Booking Received! 🎉</h2>
          <p style="color:#aaa;margin-bottom:24px;">Hi <strong style="color:#fff;">${appointment.name}</strong>, your appointment has been received. We'll confirm it shortly.</p>
          <div style="background:#1e1e1e;border:1px solid rgba(249,115,22,0.3);border-radius:10px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#aaa;padding:6px 0;font-size:13px;">Service</td><td style="color:#fff;font-weight:600;text-align:right;">${serviceName}</td></tr>
              <tr><td style="color:#aaa;padding:6px 0;font-size:13px;">Vehicle</td><td style="color:#fff;font-weight:600;text-align:right;">${appointment.vehicle}</td></tr>
              <tr><td style="color:#aaa;padding:6px 0;font-size:13px;">Date</td><td style="color:#fff;font-weight:600;text-align:right;">${new Date(appointment.date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
              <tr><td style="color:#aaa;padding:6px 0;font-size:13px;">Time</td><td style="color:#f97316;font-weight:700;text-align:right;">${appointment.timeSlot}</td></tr>
              <tr><td style="color:#aaa;padding:6px 0;font-size:13px;">Status</td><td style="color:#e9c46a;font-weight:600;text-align:right;">Pending Confirmation</td></tr>
            </table>
          </div>
          <p style="color:#666;font-size:12px;text-align:center;">Questions? Call us at <strong style="color:#f97316;">+61 2 9000 0000</strong></p>
          <hr style="border-color:#222;margin:20px 0;"/>
          <p style="color:#444;font-size:11px;text-align:center;">© 2024 Everest Auto Hub, Australia</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[EMAIL] Booking confirmation failed:', err.message);
  }
};

// ─── CHECK SLOT AVAILABILITY (public) ────────────────────────────────────────
// Returns which slots are already taken for a given date + service
router.get('/availability', async (req, res) => {
  try {
    const { date, service } = req.query;
    if (!date || !service)
      return res.status(400).json({ message: 'date and service are required' });

    // Find all non-cancelled bookings for this date and service
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const booked = await Appointment.find({
      service,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] },
    }).select('timeSlot');

    const bookedSlots = booked.map(a => a.timeSlot);
    res.json({ bookedSlots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── BOOK APPOINTMENT ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, vehicle, service, date, timeSlot, message } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !vehicle || !service || !date || !timeSlot)
      return res.status(400).json({ message: 'All fields are required' });

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Invalid email address' });

    // Validate date is not in the past
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today)
      return res.status(400).json({ message: 'Cannot book appointments in the past' });

    // Validate service exists
    const serviceDoc = await Service.findById(service);
    if (!serviceDoc || !serviceDoc.isActive)
      return res.status(400).json({ message: 'Selected service is not available' });

    // ── DOUBLE BOOKING PREVENTION ──────────────────────────────────────────
    // Check if this exact slot is already taken (atomic check)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const conflict = await Appointment.findOne({
      service,
      date: { $gte: startOfDay, $lte: endOfDay },
      timeSlot,
      status: { $nin: ['cancelled'] },
    });

    if (conflict)
      return res.status(409).json({ message: `The ${timeSlot} slot on this date is already booked. Please choose a different time.` });

    // Create appointment
    const appointment = await Appointment.create({
      name: sanitize(name),
      email: sanitize(email).toLowerCase(),
      phone: sanitize(phone),
      vehicle: sanitize(vehicle),
      service,
      date: bookingDate,
      timeSlot,
      message: sanitize(message || ''),
      user: req.body.user || undefined,
    });

    // Send confirmation email (non-blocking)
    sendBookingConfirmation(appointment, serviceDoc.name);

    res.status(201).json({
      appointment,
      message: 'Appointment booked! A confirmation email has been sent.',
    });
  } catch (err) {
    console.error('[APPOINTMENT]', err.message);
    res.status(500).json({ message: 'Booking failed. Please try again.' });
  }
});

// ─── GET MY APPOINTMENTS ──────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ email: req.user.email })
      .populate('service', 'name price duration')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CANCEL OWN APPOINTMENT (user) ───────────────────────────────────────────
router.put('/cancel/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      email: req.user.email,
    });

    if (!appointment)
      return res.status(404).json({ message: 'Appointment not found' });

    if (appointment.status === 'completed')
      return res.status(400).json({ message: 'Cannot cancel a completed appointment' });

    if (appointment.status === 'cancelled')
      return res.status(400).json({ message: 'Appointment is already cancelled' });

    // Only allow cancellation 2+ hours before the appointment
    const apptDateTime = new Date(appointment.date);
    const [time, period] = appointment.timeSlot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    apptDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntil = (apptDateTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 2)
      return res.status(400).json({ message: 'Appointments can only be cancelled at least 2 hours in advance' });

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully', appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET ALL APPOINTMENTS (admin) ────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }
    const appointments = await Appointment.find(filter)
      .populate('service', 'name price duration')
      .sort({ date: 1, timeSlot: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE STATUS (admin) ────────────────────────────────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('service', 'name');

    if (!appointment)
      return res.status(404).json({ message: 'Appointment not found' });

    // Send status update email to customer
    if (req.body.status === 'confirmed' || req.body.status === 'cancelled') {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        const isConfirmed = req.body.status === 'confirmed';
        await transporter.sendMail({
          from: `"Everest Auto Hub" <${process.env.EMAIL_USER}>`,
          to: appointment.email,
          subject: `Appointment ${isConfirmed ? 'Confirmed' : 'Cancelled'} — Everest Auto Hub`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0a;color:#f8f9fa;padding:40px;border-radius:12px;">
              <h1 style="font-size:24px;font-weight:900;font-style:italic;letter-spacing:3px;margin:0 0 20px;">
                EVEREST AUTO <span style="background:#f97316;padding:2px 10px;border-radius:6px;">HUB</span>
              </h1>
              <h2 style="color:${isConfirmed ? '#2d6a4f' : '#e63946'};">
                ${isConfirmed ? '✅ Appointment Confirmed!' : '❌ Appointment Cancelled'}
              </h2>
              <p style="color:#aaa;">Hi <strong style="color:#fff;">${appointment.name}</strong>,</p>
              <p style="color:#aaa;">${isConfirmed
                ? `Your appointment for <strong style="color:#fff;">${appointment.service?.name}</strong> on <strong style="color:#f97316;">${new Date(appointment.date).toLocaleDateString('en-AU')} at ${appointment.timeSlot}</strong> has been confirmed. See you then!`
                : `Your appointment has been cancelled. Please contact us to rebook.`
              }</p>
              <p style="color:#666;font-size:12px;margin-top:24px;">📞 +61 2 9000 0000 | ✉️ info@everestautohub.com.au</p>
            </div>
          `,
        });
      } catch (e) {
        console.error('[EMAIL] Status update email failed:', e.message);
      }
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE (admin) ───────────────────────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

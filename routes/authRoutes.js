const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' }); // reduced from 30d

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Basic email format check
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Password strength: min 8 chars, at least one letter and one number
const isStrongPassword = (pw) => pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);

// Sanitize string — strip HTML/script tags
const sanitize = (str) => (str ? String(str).replace(/<[^>]*>/g, '').trim() : '');

// ─── REGISTER ───────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const name     = sanitize(req.body.name);
    const email    = sanitize(req.body.email)?.toLowerCase();
    const password = req.body.password; // don't sanitize password
    const phone    = sanitize(req.body.phone);

    // Field validation
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Please enter a valid email address' });

    if (!isStrongPassword(password))
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number' });

    const exists = await User.findOne({ email });

    // Already has a verified account — block registration
    if (exists && exists.isVerified)
      return res.status(400).json({ message: 'An account with this email already exists. Please login instead.' });

    // Has unverified account — check if they're trying too many times
    if (exists && !exists.isVerified) {
      // Update with new OTP and resend
      const otp       = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      const hashedPw  = bcrypt.hashSync(password, 12);
      exists.otp = otp; exists.otpExpiry = otpExpiry;
      exists.password = hashedPw; exists.name = name; exists.phone = phone;
      await exists.save();

      sendVerificationEmail(email, name, otp).catch(err =>
        console.error('[REGISTER] Email failed:', err.message)
      );

      return res.status(201).json({ message: 'Verification code sent to your email', email });
    }

    // New user — create account
    const otp       = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPw  = bcrypt.hashSync(password, 12);

    await User.create({ name, email, phone, password: hashedPw, isVerified: false, otp, otpExpiry });

    sendVerificationEmail(email, name, otp).catch(err =>
      console.error('[REGISTER] Email failed:', err.message)
    );

    return res.status(201).json({ message: 'Verification code sent to your email', email });
  } catch (err) {
    console.error('[REGISTER]', err.message);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ─── VERIFY OTP (registration) ──────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const email = sanitize(req.body.email)?.toLowerCase();
    const otp   = sanitize(req.body.otp);

    if (!email || !otp)
      return res.status(400).json({ message: 'Email and code are required' });

    const user = await User.findOne({ email });
    if (!user)           return res.status(404).json({ message: 'Account not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });
    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: 'Code expired. Please register again to get a new code.' });
    if (user.otp !== otp)
      return res.status(400).json({ message: 'Invalid verification code' });

    user.isVerified = true;
    user.otp        = undefined;
    user.otpExpiry  = undefined;
    await user.save();

    return res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id),
    });
  } catch (err) {
    console.error('[VERIFY-OTP]', err.message);
    return res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
});

// ─── RESEND OTP ──────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const email = sanitize(req.body.email)?.toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user)           return res.status(404).json({ message: 'Account not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

    const otp = generateOTP();
    user.otp       = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send in background
    sendVerificationEmail(email, user.name, otp).catch(err =>
      console.error('[RESEND-OTP] Email failed:', err.message)
    );
    return res.json({ message: 'New verification code sent to your email' });
  } catch (err) {
    console.error('[RESEND-OTP]', err.message);
    return res.status(500).json({ message: 'Failed to resend code. Please try again.' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const email    = sanitize(req.body.email)?.toLowerCase();
    const password = req.body.password;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Please enter a valid email address' });

    const user = await User.findOne({ email });

    // Use same message for both "not found" and "wrong password" — prevents email enumeration
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password' });

    // Unverified regular users cannot login
    if (!user.isVerified && user.role !== 'admin')
      return res.status(401).json({ message: 'Please verify your email before logging in', needsVerification: true, email });

    const match = bcrypt.compareSync(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password' });

    return res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, avatar: user.avatar || null, token: generateToken(user._id),
    });
  } catch (err) {
    console.error('[LOGIN]', err.message);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const email = sanitize(req.body.email)?.toLowerCase();
    if (!email || !isValidEmail(email))
      return res.status(400).json({ message: 'Please enter a valid email address' });

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[FORGOT-PASSWORD] No account found for: ${email}`);
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    const otp = generateOTP();
    user.otp       = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send in background
    sendPasswordResetEmail(email, user.name, otp).catch(err =>
      console.error('[FORGOT-PASSWORD] Email failed:', err.message)
    );

    return res.json({ message: 'Reset code sent to your email', email });
  } catch (err) {
    console.error('[FORGOT-PASSWORD] Error:', err.message);
    return res.status(500).json({ message: 'Failed to send reset code. Please try again.' });
  }
});

// ─── VERIFY RESET OTP ────────────────────────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const email = sanitize(req.body.email)?.toLowerCase();
    const otp   = sanitize(req.body.otp);

    if (!email || !otp)
      return res.status(400).json({ message: 'Email and code are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: 'Code expired. Please request a new one.' });
    if (user.otp !== otp)
      return res.status(400).json({ message: 'Invalid reset code' });

    return res.json({ message: 'Code verified', email });
  } catch (err) {
    console.error('[VERIFY-RESET-OTP]', err.message);
    return res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
});

// ─── RESET PASSWORD ──────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const email       = sanitize(req.body.email)?.toLowerCase();
    const otp         = sanitize(req.body.otp);
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: 'All fields are required' });

    if (!isStrongPassword(newPassword))
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: 'Code expired. Please request a new one.' });
    if (user.otp !== otp)
      return res.status(400).json({ message: 'Invalid or expired reset code' });

    user.password   = bcrypt.hashSync(newPassword, 12);
    user.otp        = undefined;
    user.otpExpiry  = undefined;
    user.isVerified = true;
    await user.save();

    return res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    console.error('[RESET-PASSWORD]', err.message);
    return res.status(500).json({ message: 'Password reset failed. Please try again.' });
  }
});

// ─── GET PROFILE ─────────────────────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  return res.json(req.user);
});

// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name)  user.name    = sanitize(req.body.name);
    if (req.body.phone) user.phone   = sanitize(req.body.phone);
    if (req.body.address) user.address = sanitize(req.body.address);
    if (req.body.avatar) user.avatar = req.body.avatar;

    if (req.body.password) {
      if (!isStrongPassword(req.body.password))
        return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number' });
      user.password = bcrypt.hashSync(req.body.password, 12);
    }

    const updated = await user.save();
    return res.json({
      _id: updated._id, name: updated.name,
      email: updated.email, role: updated.role,
      phone: updated.phone, address: updated.address,
      avatar: updated.avatar,
      token: generateToken(updated._id),
    });
  } catch (err) {
    console.error('[UPDATE-PROFILE]', err.message);
    return res.status(500).json({ message: 'Profile update failed. Please try again.' });
  }
});

module.exports = router;

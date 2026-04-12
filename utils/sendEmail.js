const nodemailer = require('nodemailer');

const getTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const baseTemplate = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111;padding:28px 40px;border-bottom:3px solid #f97316;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:22px;font-weight:900;font-style:italic;letter-spacing:2px;color:#f8f9fa;">
                    EVEREST AUTO <span style="background:#f97316;color:#fff;padding:2px 8px;border-radius:5px;">HUB</span>
                  </span>
                </td>
                <td align="right">
                  <span style="font-size:11px;color:#666;">Australia's Premier Auto Workshop</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0d0d;padding:20px 40px;border-top:1px solid #1e1e1e;">
            <p style="margin:0;font-size:11px;color:#444;text-align:center;">
              This email was sent by Everest Auto Hub &bull; Australia<br/>
              If you didn't request this, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

const otpBox = (otp, label, expiry = '10 minutes') => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:2px solid #f97316;border-radius:10px;margin:24px 0;">
    <tr>
      <td style="padding:28px;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#888;">${label}</p>
        <p style="margin:0;font-size:46px;font-weight:900;letter-spacing:14px;color:#f97316;font-family:'Courier New',monospace;">${otp}</p>
        <p style="margin:10px 0 0;font-size:12px;color:#555;">Expires in ${expiry}</p>
      </td>
    </tr>
  </table>`;

// ── Verification email ───────────────────────────────────────────────────────
const sendVerificationEmail = async (toEmail, name, otp) => {
  const body = `
    <h2 style="margin:0 0 8px;color:#f97316;font-size:22px;">Verify Your Email</h2>
    <p style="margin:0 0 20px;color:#aaa;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#f8f9fa;">${name}</strong>, thanks for joining Everest Auto Hub!<br/>
      Use the code below to verify your email address and activate your account.
    </p>
    ${otpBox(otp, 'Your verification code')}
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Enter this code on the verification page. It is valid for <strong style="color:#f8f9fa;">10 minutes</strong> and can only be used once.
    </p>`;

  await getTransporter().sendMail({
    from: `"Everest Auto Hub" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
    to: toEmail,
    subject: `${otp} is your Everest Auto Hub verification code`,
    text: `Hi ${name},\n\nYour Everest Auto Hub verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`,
    html: baseTemplate('Verify Your Email — Everest Auto Hub', body),
  });
};

// ── Password reset email ─────────────────────────────────────────────────────
const sendPasswordResetEmail = async (toEmail, name, otp) => {
  const body = `
    <h2 style="margin:0 0 8px;color:#f97316;font-size:22px;">Reset Your Password</h2>
    <p style="margin:0 0 20px;color:#aaa;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#f8f9fa;">${name}</strong>, we received a request to reset your password.<br/>
      Use the code below to set a new password.
    </p>
    ${otpBox(otp, 'Your password reset code')}
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      This code is valid for <strong style="color:#f8f9fa;">10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your account is secure.
    </p>`;

  await getTransporter().sendMail({
    from: `"Everest Auto Hub" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
    to: toEmail,
    subject: `${otp} is your Everest Auto Hub password reset code`,
    text: `Hi ${name},\n\nYour Everest Auto Hub password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
    html: baseTemplate('Reset Your Password — Everest Auto Hub', body),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
// ── Order status update email ────────────────────────────────────────────────
const sendOrderStatusEmail = async (toEmail, name, order) => {
  const statusMessages = {
    processing: { emoji: '⚙️', title: 'Order Being Processed', color: '#4cc9f0', msg: 'Your order is being prepared and will be shipped soon.' },
    shipped:    { emoji: '🚚', title: 'Order Shipped!',         color: '#4361ee', msg: `Your order is on its way! Expected delivery in 3-5 business days.` },
    delivered:  { emoji: '✅', title: 'Order Delivered!',       color: '#2d6a4f', msg: 'Your order has been delivered. Enjoy your purchase!' },
    cancelled:  { emoji: '❌', title: 'Order Cancelled',        color: '#e63946', msg: 'Your order has been cancelled. Contact us if you have questions.' },
  };

  const s = statusMessages[order.status];
  if (!s) return; // don't email for pending

  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding:8px 0;color:#aaa;font-size:13px;">${item.name}${item.size ? ` (${item.size})` : ''} ×${item.quantity}</td>
      <td style="padding:8px 0;color:#fff;font-weight:600;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`).join('');

  const body = `
    <h2 style="margin:0 0 8px;color:${s.color};font-size:22px;">${s.emoji} ${s.title}</h2>
    <p style="margin:0 0 20px;color:#aaa;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#f8f9fa;">${name}</strong>, ${s.msg}
    </p>
    <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px;margin-bottom:20px;">
      <p style="margin:0 0 12px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Order #${String(order._id).slice(-8)}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}
        <tr><td colspan="2" style="border-top:1px solid #333;padding-top:10px;"></td></tr>
        <tr>
          <td style="color:#aaa;font-size:14px;padding:4px 0;">Total</td>
          <td style="color:#f97316;font-weight:700;font-size:16px;text-align:right;">$${order.totalPrice?.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0;font-size:13px;color:#555;">Questions? Reply to this email or call <strong style="color:#f8f9fa;">+61 2 9000 0000</strong></p>`;

  await getTransporter().sendMail({
    from: `"Everest Auto Hub" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
    to: toEmail,
    subject: `${s.emoji} Order #${String(order._id).slice(-8)} — ${s.title}`,
    text: `Hi ${name},\n\n${s.msg}\n\nOrder #${String(order._id).slice(-8)}\nTotal: $${order.totalPrice?.toFixed(2)}\n\nEverest Auto Hub`,
    html: baseTemplate(`${s.title} — Everest Auto Hub`, body),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendOrderStatusEmail };

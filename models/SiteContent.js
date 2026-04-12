const mongoose = require('mongoose');

const siteContentSchema = new mongoose.Schema({
  // ── ABOUT PAGE ──────────────────────────────────────────
  aboutHeroTag:       { type: String, default: 'Our Story' },
  aboutHeroTitle:     { type: String, default: 'About Everest Auto Hub' },
  aboutHeroSubtitle:  { type: String, default: 'Driven by passion, built on trust' },
  aboutHeroImage:     { type: String, default: '' },
  aboutWhoTag:        { type: String, default: 'Who We Are' },
  aboutWhoTitle:      { type: String, default: "Australia's Most Trusted Auto Workshop" },
  aboutPara1:         { type: String, default: 'Founded over a decade ago, Everest Auto Hub has grown from a small garage to one of Australia\'s most trusted automotive service centres. We combine technical expertise with genuine care for every vehicle that comes through our doors.' },
  aboutPara2:         { type: String, default: 'Beyond auto services, we launched our own clothing brand — Everest Clothing — to let car enthusiasts wear their passion. Every piece is designed with the same attention to quality that defines our workshop.' },
  aboutImage:         { type: String, default: '' },
  aboutTeamTag:       { type: String, default: 'Our Team' },
  aboutTeamTitle:     { type: String, default: 'Meet Our Experts' },
  aboutTeam: {
    type: [{
      name: { type: String, default: '' },
      role: { type: String, default: '' },
      exp:  { type: String, default: '' },
      image:{ type: String, default: '' },
    }],
    default: [
      { name: 'Rajesh Sharma', role: 'Head Mechanic',     exp: '15 years' },
      { name: 'Bikash Thapa',  role: 'Engine Specialist', exp: '10 years' },
      { name: 'Suman Rai',     role: 'Electrical Expert', exp: '8 years'  },
      { name: 'Dipak Gurung',  role: 'Body & Paint',      exp: '12 years' },
    ],
  },

  // ── SERVICES PAGE ────────────────────────────────────────
  servicesHeroTag:      { type: String, default: 'What We Offer' },
  servicesHeroTitle:    { type: String, default: 'Our Services' },
  servicesHeroSubtitle: { type: String, default: 'Professional auto care from certified mechanics' },
  servicesHeroImage:    { type: String, default: '' },

  // ── CONTACT PAGE ─────────────────────────────────────────
  contactHeroTag:      { type: String, default: 'Get In Touch' },
  contactHeroTitle:    { type: String, default: 'Contact Us' },
  contactHeroSubtitle: { type: String, default: "We're here to help with any questions" },
  contactAddress:      { type: String, default: '123 Workshop Street, Auto District, Sydney NSW 2000, Australia' },
  contactPhone1:       { type: String, default: '+61 2 9000 0000' },
  contactPhone2:       { type: String, default: '+61 2 9111 1111' },
  contactEmail:        { type: String, default: 'info@everestautohub.com' },
  contactHours1:       { type: String, default: 'Monday - Saturday: 8:00 AM - 7:00 PM' },
  contactHours2:       { type: String, default: 'Sunday: 10:00 AM - 4:00 PM' },
  contactMapEmbed:     { type: String, default: '' },

  // ── APPOINTMENT PAGE ─────────────────────────────────────
  apptHeroTag:      { type: String, default: 'Schedule a Visit' },
  apptHeroTitle:    { type: String, default: 'Book an Appointment' },
  apptHeroSubtitle: { type: String, default: "Fill in the form below and we'll confirm your slot" },
  apptHeroImage:    { type: String, default: '' },
  apptWhyTitle:     { type: String, default: 'Why Book With Us?' },
  apptWhyPoints:    { type: [String], default: ['Confirmation email sent instantly', 'Real-time slot availability', 'Expert certified mechanics', 'Transparent pricing', 'Free vehicle inspection', 'Cancel up to 2 hours before'] },
  apptPhone:        { type: String, default: '+61 2 9000 0000' },
  apptEmail:        { type: String, default: 'info@everestautohub.com.au' },

  // ── SHOP PAGE ────────────────────────────────────────────
  shopHeroTag:      { type: String, default: 'Everest Clothing' },
  shopHeroTitle:    { type: String, default: 'Our Shop' },
  shopHeroSubtitle: { type: String, default: 'Premium automotive lifestyle clothing' },
  shopHeroImage:    { type: String, default: '' },

  // ── NAVBAR / FOOTER ──────────────────────────────────────
  footerTagline:    { type: String, default: "Australia's premier auto workshop & lifestyle brand." },
  footerPhone:      { type: String, default: '+61 2 9000 0000' },
  footerEmail:      { type: String, default: 'info@everestautohub.com.au' },
  footerAddress:    { type: String, default: 'Sydney, NSW, Australia' },
  footerCopyright:  { type: String, default: '© 2024 Everest Auto Hub. All rights reserved.' },

}, { timestamps: true });

module.exports = mongoose.model('SiteContent', siteContentSchema);

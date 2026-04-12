const mongoose = require('mongoose');

const homeContentSchema = new mongoose.Schema({
  // Hero Section
  heroBadge: { type: String, default: "🇦🇺 Australia's Premier Auto Workshop" },
  heroSubtitle: { type: String, default: "Expert auto repair, maintenance & your favorite automotive lifestyle brand. We keep your ride smooth and your style sharp." },
  heroImage: { type: String, default: '' },

  // Why Us Section
  whyTitle: { type: String, default: 'Built on Trust & Expertise' },
  whySubtitle: { type: String, default: "At Everest Auto Hub, we combine technical expertise with genuine care for your vehicle. Our team of certified mechanics ensures every job is done right the first time." },
  whyImage: { type: String, default: '' },

  // Shop Banner Section
  shopBannerTag: { type: String, default: 'Everest Clothing' },
  shopBannerTitle: { type: String, default: 'Wear Your Passion' },
  shopBannerSubtitle: { type: String, default: 'Exclusive automotive lifestyle clothing. Rep the Everest brand with premium quality tees, hoodies, caps and more.' },
  shopBannerImage: { type: String, default: '' },

  // CTA Section
  ctaTitle: { type: String, default: 'Ready to Book Your Service?' },
  ctaSubtitle: { type: String, default: 'Schedule your appointment today and get your vehicle back in top shape.' },
  ctaPhone: { type: String, default: '+61 2 9000 0000' },

  // Services Section
  servicesSectionTag: { type: String, default: 'What We Do' },
  servicesSectionTitle: { type: String, default: 'Our Services' },
  servicesSectionSubtitle: { type: String, default: 'Professional auto care services to keep your vehicle in peak condition' },
}, { timestamps: true });

module.exports = mongoose.model('HomeContent', homeContentSchema);

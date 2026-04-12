require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

// Import models directly without pre-save hooks causing issues
const User = require('./models/User');
const Service = require('./models/Service');
const Product = require('./models/Product');

const services = [
  { name: 'Oil Change', description: 'Full synthetic or conventional oil change with filter replacement.', price: 89, duration: '30-45 min', icon: 'oil' },
  { name: 'Brake Service', description: 'Brake pad replacement, rotor inspection and brake fluid check.', price: 180, duration: '1-2 hours', icon: 'brake' },
  { name: 'Engine Diagnostics', description: 'Full computer diagnostics to identify engine issues.', price: 120, duration: '1 hour', icon: 'engine' },
  { name: 'Tire Rotation & Balancing', description: 'Rotate and balance all four tires for even wear.', price: 75, duration: '45 min', icon: 'tire' },
  { name: 'AC Service', description: 'AC gas refill, leak check and compressor inspection.', price: 150, duration: '1-2 hours', icon: 'ac' },
  { name: 'Full Car Service', description: 'Complete vehicle inspection and maintenance package.', price: 320, duration: '3-4 hours', icon: 'car' },
];

const products = [
  { name: 'Everest Classic Tee', description: 'Premium cotton t-shirt with Everest Auto Hub logo.', price: 45, category: 'T-Shirts', sizes: ['S','M','L','XL','XXL'], colors: ['Black','White','Red'], stock: 50, isFeatured: true, images: ['https://via.placeholder.com/400x400?text=Classic+Tee'] },
  { name: 'Everest Mechanic Hoodie', description: 'Heavy-duty hoodie perfect for the garage.', price: 89, category: 'Hoodies', sizes: ['M','L','XL','XXL'], colors: ['Black','Grey'], stock: 30, isFeatured: true, images: ['https://via.placeholder.com/400x400?text=Mechanic+Hoodie'] },
  { name: 'Everest Snapback Cap', description: 'Adjustable snapback cap with embroidered logo.', price: 35, category: 'Caps', sizes: ['One Size'], colors: ['Black','Red'], stock: 100, isFeatured: true, images: ['https://via.placeholder.com/400x400?text=Snapback+Cap'] },
  { name: 'Everest Racing Jacket', description: 'Lightweight racing-style jacket with reflective strips.', price: 149, category: 'Jackets', sizes: ['S','M','L','XL'], colors: ['Black','Blue'], stock: 20, isFeatured: true, images: ['https://via.placeholder.com/400x400?text=Racing+Jacket'] },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log('✅ MongoDB Connected');

    // Only clear services and products — NEVER touch users
    await Service.deleteMany({});
    await Product.deleteMany({});

    // Only create admin if no admin exists yet
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await User.collection.insertOne({
        name: 'Admin',
        email: 'admin@everestautohub.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('👤 Admin created: admin@everestautohub.com / admin123');
    } else {
      console.log('👤 Admin already exists — skipped');
    }

    await Service.insertMany(services);
    await Product.insertMany(products);

    console.log('✅ Services and products seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Error:', err.message);
    process.exit(1);
  }
};

seed();

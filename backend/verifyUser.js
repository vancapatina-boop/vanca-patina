/**
 * Quick script to mark a user as verified in MongoDB
 * Run: node verifyUser.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const User = require('./models/User');

const EMAIL = 'vancapatina@gmail.com';

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected...');

    const user = await User.findOne({ email: EMAIL });
    if (!user) {
      console.log(`❌ User not found: ${EMAIL}`);
      console.log('Creating user account...');
      await User.create({
        name: 'Ankit Mishra',
        email: EMAIL,
        password: 'Ankitmishra1@',
        role: 'user',
        isVerified: true,
      });
      console.log(`✅ User created and verified: ${EMAIL}`);
    } else {
      console.log(`Found user: ${user.email}, isVerified: ${user.isVerified}, role: ${user.role}`);
      user.isVerified = true;
      user.verificationTokenHash = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();
      console.log(`✅ User verified successfully: ${EMAIL}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   isBlocked: ${user.isBlocked}`);
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });

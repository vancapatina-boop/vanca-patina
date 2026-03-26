const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/vanca_patina')
  .then(async () => {
    console.log('MongoDB Connected');
    
    const adminExists = await User.findOne({ email: 'admin@vancapatina.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin User',
        email: 'admin@vancapatina.com',
        password: 'password123',
        role: 'admin'
      });
      console.log('Admin user created: admin@vancapatina.com / password123');
    } else {
      console.log('Admin already exists.');
    }
    
    process.exit();
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

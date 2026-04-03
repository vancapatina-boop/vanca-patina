const User = require('../models/User');
const asyncHandler = require("../utils/asyncHandler");

// Auth endpoints moved to `controllers/authController.js`

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    addresses: user.addresses || [],
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  user.name = req.body.name ?? user.name;
  user.email = req.body.email ?? user.email;
  user.phone = req.body.phone ?? user.phone;
  if (req.body.password) user.password = req.body.password;

  const updatedUser = await user.save();
  res.json({
    _id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    role: updatedUser.role,
    isVerified: updatedUser.isVerified,
  });
});

const getUserAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  res.json(user.addresses || []);
});

const addUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const addressData = {
    label: req.body.label ?? 'Home',
    address: req.body.address,
    city: req.body.city,
    postalCode: req.body.postalCode,
    country: req.body.country,
    isDefault: req.body.isDefault || false,
  };

  if (addressData.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  user.addresses.push(addressData);
  await user.save();

  res.status(201).json(user.addresses);
});

const updateUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const address = user.addresses.id(req.params.addressId);
  if (!address) {
    const err = new Error("Address not found");
    err.statusCode = 404;
    throw err;
  }

  address.label = req.body.label ?? address.label;
  address.address = req.body.address ?? address.address;
  address.city = req.body.city ?? address.city;
  address.postalCode = req.body.postalCode ?? address.postalCode;
  address.country = req.body.country ?? address.country;
  if (req.body.isDefault !== undefined) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
    address.isDefault = req.body.isDefault;
  }

  await user.save();
  res.json(user.addresses);
});

const deleteUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  user.addresses = user.addresses.filter((addr) => addr.id !== req.params.addressId);
  await user.save();

  res.json(user.addresses);
});

module.exports = { getUserProfile, updateUserProfile, getUserAddresses, addUserAddress, updateUserAddress, deleteUserAddress };

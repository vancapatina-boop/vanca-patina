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

function buildCombinedAddressLine(body) {
  if (body.address && String(body.address).trim()) {
    return String(body.address).trim();
  }
  const parts = [body.address1, body.address2].filter((p) => p && String(p).trim());
  return parts.length ? parts.map((p) => String(p).trim()).join(', ') : '';
}

const addUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const combined = buildCombinedAddressLine(req.body);
  const addressData = {
    label: req.body.label ?? 'Home',
    address: combined,
    city: req.body.city,
    postalCode: req.body.postalCode,
    country: req.body.country,
    isDefault: Boolean(req.body.isDefault),
    fullName: req.body.fullName,
    phoneNumber: req.body.phoneNumber,
    email: req.body.email,
    state: req.body.state,
    address1: req.body.address1,
    address2: req.body.address2,
    addressType: req.body.addressType || 'home',
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

  if (req.body.label !== undefined) address.label = req.body.label;
  if (req.body.city !== undefined) address.city = req.body.city;
  if (req.body.postalCode !== undefined) address.postalCode = req.body.postalCode;
  if (req.body.country !== undefined) address.country = req.body.country;
  if (req.body.fullName !== undefined) address.fullName = req.body.fullName;
  if (req.body.phoneNumber !== undefined) address.phoneNumber = req.body.phoneNumber;
  if (req.body.email !== undefined) address.email = req.body.email;
  if (req.body.state !== undefined) address.state = req.body.state;
  if (req.body.address1 !== undefined) address.address1 = req.body.address1;
  if (req.body.address2 !== undefined) address.address2 = req.body.address2;
  if (req.body.addressType !== undefined) address.addressType = req.body.addressType;

  const combined = buildCombinedAddressLine(req.body);
  if (combined) {
    address.address = combined;
  } else if (req.body.address !== undefined) {
    address.address = req.body.address;
  }

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

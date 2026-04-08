import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';
import { User } from '../models/User.js';
import { signToken } from '../utils/token.js';

function publicUser(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl || '',
  };
}

export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const safeRole = role === 'admin' ? 'admin' : 'member';
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: safeRole,
    });
    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: publicUser(user),
    });
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    res.json({
      token,
      user: publicUser(user),
    });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res) {
  res.json({
    user: publicUser(req.user),
  });
}

export async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (name !== undefined) user.name = name;
    await user.save();
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
}

export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const folder = process.env.CLOUDINARY_FOLDER || 'pmtool-attachments';
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch {
        /* ignore */
      }
    }
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `${folder}/avatars`, resource_type: 'image' },
        (err, out) => (err ? reject(err) : resolve(out))
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });
    user.avatarUrl = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save();
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
}

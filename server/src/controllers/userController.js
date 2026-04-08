import { User } from '../models/User.js';

export async function searchUsers(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ users: [] });
    }
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name email role avatarUrl')
      .limit(20)
      .lean();
    res.json({ users });
  } catch (e) {
    next(e);
  }
}

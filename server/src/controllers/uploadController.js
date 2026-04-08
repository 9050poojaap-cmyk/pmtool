import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';

export async function uploadFile(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const folder = process.env.CLOUDINARY_FOLDER || 'pmtool-attachments';
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (err, out) => (err ? reject(err) : resolve(out))
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      originalName: req.file.originalname,
      resourceType: result.resource_type || 'auto',
    });
  } catch (e) {
    next(e);
  }
}

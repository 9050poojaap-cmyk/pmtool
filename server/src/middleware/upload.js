import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadSingle = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024 },
}).single('file');

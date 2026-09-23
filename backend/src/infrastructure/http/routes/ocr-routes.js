import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { upload } from '../middleware/upload.js';
import { ValidationError } from '../../../shared/errors.js';

export function ocrRoutes({ invoiceOcrService }) {
  const router = Router();

  router.post('/extract', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError('Archivo no recibido');
    const result = await invoiceOcrService.extract({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
    });
    res.json(result);
  }));

  return router;
}

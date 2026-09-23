import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { upload } from '../middleware/upload.js';
import { ValidationError } from '../../../shared/errors.js';

export function transactionRoutes({ transactionService }) {
  const router = Router();

  router.get('/transactions', asyncHandler(async (req, res) => {
    res.json(await transactionService.listAll());
  }));

  router.post('/transactions', asyncHandler(async (req, res) => {
    const transaction = await transactionService.createFree({
      direction: req.body.direction,
      amount: req.body.amount,
      baseAmount: req.body.baseAmount,
      vatRate: req.body.vatRate,
      date: req.body.date,
      invoiceNumber: req.body.invoiceNumber,
      counterparty: req.body.counterparty,
      memberId: req.body.memberId,
      carId: req.body.carId,
      houseId: req.body.houseId,
      category: req.body.category,
      notes: req.body.notes,
    });
    res.status(201).json(transaction);
  }));

  router.get('/contracts/:id/transactions', asyncHandler(async (req, res) => {
    res.json(await transactionService.listByContract(req.params.id));
  }));

  router.post('/contracts/:id/transactions', upload.single('file'), asyncHandler(async (req, res) => {
    if (req.file) {
      const transaction = await transactionService.createFromUpload({
        contractId: req.params.id,
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        invoiceNumber: req.body.invoiceNumber || null,
        amount: req.body.amount || null,
        baseAmount: req.body.baseAmount || null,
        vatRate: req.body.vatRate || null,
        vatAmount: req.body.vatAmount || null,
        withholdingRate: req.body.withholdingRate || null,
        withholdingAmount: req.body.withholdingAmount || null,
        date: req.body.date || null,
        counterparty: req.body.counterparty || null,
        memberId: req.body.memberId || null,
        billingPeriod: req.body.billingPeriod || null,
        notes: req.body.notes || null,
      });
      return res.status(201).json(transaction);
    }

    const transaction = await transactionService.createManual({
      contractId: req.params.id,
      amount: req.body.amount,
      baseAmount: req.body.baseAmount,
      vatRate: req.body.vatRate,
      vatAmount: req.body.vatAmount,
      withholdingRate: req.body.withholdingRate,
      withholdingAmount: req.body.withholdingAmount,
      date: req.body.date,
      invoiceNumber: req.body.invoiceNumber,
      counterparty: req.body.counterparty,
      memberId: req.body.memberId,
      notes: req.body.notes,
    });
    res.status(201).json(transaction);
  }));

  router.get('/transactions/:id', asyncHandler(async (req, res) => {
    res.json(await transactionService.get(req.params.id));
  }));

  router.get('/transactions/:id/document', asyncHandler(async (req, res) => {
    const { transaction, buffer } = await transactionService.getDocument(req.params.id);
    res.setHeader('Content-Type', transaction.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(transaction.fileName || transaction.id)}"`);
    res.send(buffer);
  }));

  router.put('/transactions/:id', asyncHandler(async (req, res) => {
    res.json(await transactionService.update(req.params.id, req.body));
  }));

  router.delete('/transactions/:id', asyncHandler(async (req, res) => {
    res.json(await transactionService.remove(req.params.id));
  }));

  return router;
}

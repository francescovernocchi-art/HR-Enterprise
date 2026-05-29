const fs = require('fs/promises');
const dipendentiImportService = require('../services/dipendentiImportService');

async function importDipendenti(req, res, next) {
  let keepUploadedFile = false;

  try {
    if (req.body?.previewId) {
      const result = await dipendentiImportService.startImportFromPreview(
        req.body.previewId,
        req.body.mapping || {},
        req.body.fileName
      );

      return res.status(202).json({
        message: 'Employee import started',
        data: result,
      });
    }

    if (!req.file) {
      const error = new Error('CSV file is required');
      error.status = 400;
      throw error;
    }

    keepUploadedFile = true;
    const result = await dipendentiImportService.startImportFromCsv(req.file);

    res.status(202).json({
      message: 'Employee import started',
      data: result,
    });
  } catch (error) {
    next(error);
  } finally {
    if (!keepUploadedFile && req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
}

async function previewDipendentiImport(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('CSV file is required');
      error.status = 400;
      throw error;
    }

    const result = await dipendentiImportService.createPreview(req.file);

    res.status(201).json({
      message: 'Employee import preview created',
      data: result,
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
}

async function validateDipendentiImport(req, res, next) {
  try {
    const { previewId, mapping } = req.body || {};

    if (!previewId) {
      const error = new Error('previewId is required');
      error.status = 400;
      throw error;
    }

    const result = await dipendentiImportService.validatePreview(previewId, mapping || {});

    res.json({
      message: 'Employee import validation completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  importDipendenti,
  previewDipendentiImport,
  validateDipendentiImport,
};

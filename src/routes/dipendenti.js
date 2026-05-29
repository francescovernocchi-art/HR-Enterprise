const express = require('express');
const db = require('../db');
const uploadCsv = require('../middleware/uploadCsv');
const dipendentiImportController = require('../controllers/dipendentiImportController');
const dipendentiProfileController = require('../controllers/dipendentiProfileController');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM core.dipendenti ORDER BY cognome ASC'
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/import',
  uploadCsv.single('file'),
  dipendentiImportController.importDipendenti
);

router.post(
  '/import/preview',
  uploadCsv.single('file'),
  dipendentiImportController.previewDipendentiImport
);

router.post(
  '/import/validate',
  dipendentiImportController.validateDipendentiImport
);

router.get('/:id/dati', dipendentiProfileController.getDynamicData);

router.get('/:id', dipendentiProfileController.getProfile);

module.exports = router;

const express = require('express');
const hrImportController = require('../controllers/hrImportController');
const hrDipendentiController = require('../controllers/hrDipendentiController');
const uploadCsv = require('../middleware/uploadCsv');

const router = express.Router();

router.post('/import-csv', uploadCsv.single('file'), hrImportController.importCsv);
router.get('/import/:id/status', hrImportController.getImportStatus);
router.get('/dashboard', hrDipendentiController.dashboard);
router.get('/dashboard/scadenze', hrDipendentiController.dashboardScadenze);
router.get('/scadenze', hrDipendentiController.listScadenze);
router.post('/scadenze/rigenera', hrDipendentiController.rigeneraScadenze);
router.get('/dipendenti', hrDipendentiController.list);
router.get('/dipendenti/:id', hrDipendentiController.getById);
router.put('/dipendenti/:id', hrDipendentiController.update);
router.get('/dipendenti/:id/contratto', hrDipendentiController.getContratto);
router.get('/dipendenti/:id/contatti', hrDipendentiController.getContatti);
router.get('/dipendenti/:id/indirizzi', hrDipendentiController.getIndirizzi);
router.get('/dipendenti/:id/vigilanza', hrDipendentiController.getVigilanza);
router.put('/dipendenti/:id/vigilanza', hrDipendentiController.updateVigilanza);

module.exports = router;

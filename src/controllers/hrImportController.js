const dipendentiImportService = require('../services/dipendentiImportService');
const hrCoreService = require('../services/hrCoreService');

async function getImportStatus(req, res, next) {
  try {
    const status = await dipendentiImportService.getImportSessionStatus(req.params.id);
    res.json(status);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getImportStatus,
  importCsv: async (req, res, next) => {
    try {
      if (!req.file) {
        const error = new Error('CSV file is required');
        error.status = 400;
        throw error;
      }

      const report = await hrCoreService.importCsv(req.file);
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  },
};

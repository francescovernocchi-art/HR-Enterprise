const hrCoreService = require('../services/hrCoreService');

async function list(req, res, next) {
  try {
    res.json(await hrCoreService.listDipendenti(req.query.search || ''));
  } catch (error) {
    next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    res.json(await hrCoreService.getDashboard());
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await hrCoreService.getDipendente(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    res.json(await hrCoreService.updateDipendente(req.params.id, req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function getContratto(req, res, next) {
  try {
    res.json(await hrCoreService.getContratto(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function getContatti(req, res, next) {
  try {
    res.json(await hrCoreService.getContatti(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function getIndirizzi(req, res, next) {
  try {
    res.json(await hrCoreService.getIndirizzi(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function getVigilanza(req, res, next) {
  try {
    res.json(await hrCoreService.getVigilanza(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function updateVigilanza(req, res, next) {
  try {
    res.json(await hrCoreService.updateVigilanza(req.params.id, req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function listScadenze(req, res, next) {
  try {
    res.json(await hrCoreService.getScadenze(req.query || {}));
  } catch (error) {
    next(error);
  }
}

async function rigeneraScadenze(req, res, next) {
  try {
    res.json(await hrCoreService.rigeneraScadenze());
  } catch (error) {
    next(error);
  }
}

async function dashboardScadenze(req, res, next) {
  try {
    res.json(await hrCoreService.getDashboardScadenze());
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getById,
  getContatti,
  getContratto,
  dashboard,
  getIndirizzi,
  getVigilanza,
  list,
  listScadenze,
  dashboardScadenze,
  rigeneraScadenze,
  update,
  updateVigilanza,
};

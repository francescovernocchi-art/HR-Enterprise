const dipendentiProfileService = require('../services/dipendentiProfileService');

async function getProfile(req, res, next) {
  try {
    const profile = await dipendentiProfileService.getEmployeeProfile(req.params.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

async function getDynamicData(req, res, next) {
  try {
    const data = await dipendentiProfileService.getEmployeeDynamicData(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDynamicData,
  getProfile,
};

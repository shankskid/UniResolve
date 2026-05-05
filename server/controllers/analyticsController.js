const AnalyticsService = require("../services/AnalyticsService");

function mapError(error, res, next) {
  if (
    error.message.includes("cannot access") ||
    error.message.includes("Only university admin") ||
    error.message.includes("can only") ||
    error.message === "Officer not found."
  ) {
    return res.status(403).json({ message: error.message });
  }
  return next(error);
}

async function overview(req, res, next) {
  try {
    const data = await AnalyticsService.getOverview(req.user);
    return res.status(200).json(data);
  } catch (error) {
    return mapError(error, res, next);
  }
}

async function officer(req, res, next) {
  try {
    const data = await AnalyticsService.getOfficerAnalytics(req.user, req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    if (error.message === "Officer not found.") {
      return res.status(404).json({ message: error.message });
    }
    return mapError(error, res, next);
  }
}

async function byCategory(req, res, next) {
  try {
    const data = await AnalyticsService.getByCategory(req.user, req.query.campus_id);
    return res.status(200).json({ items: data });
  } catch (error) {
    return mapError(error, res, next);
  }
}

async function slaCompliance(req, res, next) {
  try {
    const data = await AnalyticsService.getSlaCompliance(req.user);
    return res.status(200).json(data);
  } catch (error) {
    return mapError(error, res, next);
  }
}

async function campusComparison(req, res, next) {
  try {
    const data = await AnalyticsService.getCampusComparison(req.user);
    return res.status(200).json({ items: data });
  } catch (error) {
    return mapError(error, res, next);
  }
}

async function exportReport(req, res, next) {
  try {
    const csv = await AnalyticsService.exportTicketsCsv(req.user, req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"tickets-report.csv\"");
    return res.status(200).send(csv);
  } catch (error) {
    return mapError(error, res, next);
  }
}

async function auditLog(req, res, next) {
  try {
    const items = await AnalyticsService.getAuditLog(req.user, req.query);
    return res.status(200).json({ items });
  } catch (error) {
    return mapError(error, res, next);
  }
}

module.exports = {
  overview,
  officer,
  byCategory,
  slaCompliance,
  campusComparison,
  exportReport,
  auditLog
};

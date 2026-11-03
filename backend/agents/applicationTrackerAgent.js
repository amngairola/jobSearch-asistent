const fileStore = require('../utils/fileStore');
const { v4: uuidv4 } = require('uuid');

/**
 * ApplicationTrackerAgent provides CRUD-like access to application records persisted via fileStore.
 */
class ApplicationTrackerAgent {
  /** Retrieve a single application by its internal id */
  async getApplicationById(applicationId) {
    const apps = fileStore.findAll('applications');
    return apps.find(app => app.id === applicationId) || null;
  }

  /** Retrieve all applications for a given session (user) */
  async getUserApplications(sessionId) {
    const apps = fileStore.findAll('applications');
    return apps.filter(app => app.sessionId === sessionId);
  }

  /** Store or update an application record */
  async upsertApplication(appRecord) {
    if (!appRecord.id) appRecord.id = uuidv4();
    if (!appRecord.status) appRecord.status = 'saved';
    fileStore.upsert('applications', appRecord);
    return appRecord;
  }

  /** Update just the status of an application */
  async updateStatus(applicationId, newStatus) {
    const apps = fileStore.findAll('applications');
    const app = apps.find(a => a.id === applicationId);
    if (!app) throw new Error('Application not found');
    app.status = newStatus;
    app.updatedAt = new Date().toISOString();
    fileStore.upsert('applications', app);
    return app;
  }
}

module.exports = ApplicationTrackerAgent;

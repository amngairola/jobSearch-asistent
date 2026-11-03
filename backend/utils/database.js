/**
 * Database abstraction layer — now just delegates to fileStore.
 * Keeps the same API surface so nothing breaks in orchestratorAgent.
 */
const fileStore = require('./fileStore');

class Database {
  async findOne(collection, query) {
    const records = fileStore.listRecords(collection);
    for (const rec of records) {
      let match = true;
      for (const key in query) {
        if (rec[key] !== query[key]) { match = false; break; }
      }
      if (match) return rec;
    }
    return null;
  }

  async find(collection, query = {}) {
    const records = fileStore.listRecords(collection);
    return records.filter(rec => {
      for (const key in query) {
        if (rec[key] !== query[key]) return false;
      }
      return true;
    });
  }

  async upsert(collection, id, data) {
    return fileStore.saveRecord(collection, id, { ...data, id });
  }

  async insert(collection, data) {
    const id = data.id || data.session_id || Date.now().toString();
    return fileStore.saveRecord(collection, id, { ...data, id });
  }

  async update(collection, id, data) {
    const existing = fileStore.loadRecord(collection, id);
    const updated = { ...(existing || {}), ...data, id, updatedAt: new Date().toISOString() };
    return fileStore.saveRecord(collection, id, updated);
  }

  async delete(collection, id) {
    return fileStore.deleteRecord(collection, id);
  }

  async disconnect() {
    // no-op for file storage
  }
}

module.exports = new Database();

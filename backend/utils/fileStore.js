const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Simple JSON file based store with configurable base directory.
 * The base directory is taken from env STORAGE_DIR or defaults to
 * path.join(__dirname, '..', 'data'). All collections are stored as
 * separate JSON files named `${name}.json`.
 *
 * Uses atomic writes (write to temp file then rename) to prevent corruption.
 */
class FileStore {
  constructor() {
    const defaultDir = path.join(__dirname, '..', 'data');
    let targetDir = process.env.STORAGE_DIR || defaultDir;

    const isWritable = (dir) => {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const testFile = path.join(dir, `.store_probe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
        fs.writeFileSync(testFile, 'ok');
        fs.unlinkSync(testFile);
        return true;
      } catch (_) {
        return false;
      }
    };

    if (!isWritable(targetDir)) {
      console.warn(`[WARN] Configured storage directory "${targetDir}" is not writable. Falling back to "${defaultDir}".`);
      targetDir = defaultDir;
      if (!isWritable(targetDir)) {
        throw new Error(`CRITICAL: Neither "${process.env.STORAGE_DIR}" nor "${defaultDir}" is writable.`);
      }
    }

    this.baseDir = targetDir;
    // Ensure standard subdirectories exist
    for (const sub of ['resumes', 'sessions', 'applications', 'jobs', 'uploads']) {
      const dir = path.join(this.baseDir, sub);
      if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
      }
    }
  }

  _filePath(name) {
    return path.join(this.baseDir, `${name}.json`);
  }

  _load(name) {
    const file = this._filePath(name);
    if (!fs.existsSync(file)) return [];
    try {
      const raw = fs.readFileSync(file, 'utf8').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Ensure we always return an array
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error(`Failed to load ${name}:`, e.message);
      // If corrupted, back up the file and start fresh
      try {
        const backup = file + '.bak.' + Date.now();
        fs.copyFileSync(file, backup);
        console.warn(`Backed up corrupted file to ${backup}`);
      } catch (_) {}
      return [];
    }
  }

  _save(name, data) {
    const file = this._filePath(name);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Atomic write: write to temp file then rename
    const tmpFile = path.join(dir, `.${path.basename(file)}.tmp.${process.pid}`);
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmpFile, file);
    } catch (e) {
      // Cleanup tmp on failure
      try { fs.unlinkSync(tmpFile); } catch (_) {}
      throw e;
    }
  }

  /** Load all documents from a collection */
  findAll(name) {
    return this._load(name);
  }

  /** Find a document by predicate */
  findOne(name, predicate) {
    const all = this._load(name);
    return all.find(predicate) || null;
  }

  /** Insert or update a document (upsert based on id) */
  upsert(name, doc) {
    const all = this._load(name);
    const idx = all.findIndex(item => item.id === doc.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...doc };
    } else {
      all.push(doc);
    }
    this._save(name, all);
    return doc;
  }

  /** Delete documents matching predicate */
  delete(name, predicate) {
    const all = this._load(name);
    const filtered = all.filter(item => !predicate(item));
    this._save(name, filtered);
    return all.length - filtered.length;
  }

  /** Simple per-id file storage (for resumes, sessions etc.) */
  saveRecord(collection, id, data) {
    const dir = path.join(this.baseDir, collection);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.json`);
    const tmpFile = file + '.tmp.' + process.pid;
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmpFile, file);
    } catch (e) {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
      throw e;
    }
    return data;
  }

  loadRecord(collection, id) {
    const file = path.join(this.baseDir, collection, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      const raw = fs.readFileSync(file, 'utf8').trim();
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Failed to load record ${collection}/${id}:`, e.message);
      return null;
    }
  }

  listRecords(collection) {
    const dir = path.join(this.baseDir, collection);
    if (!fs.existsSync(dir)) return [];
    try {
      return fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          } catch (_) { return null; }
        })
        .filter(Boolean);
    } catch (e) {
      console.error(`Failed to list ${collection}:`, e.message);
      return [];
    }
  }

  deleteRecord(collection, id) {
    const file = path.join(this.baseDir, collection, `${id}.json`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }
}

module.exports = new FileStore();

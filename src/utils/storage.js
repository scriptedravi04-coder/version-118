// A safe, fallback-enabled localStorage utility to prevent crashes in sandboxed iframes.
const memoryStore = {};

const isStorageAvailable = () => {
  try {
    const key = "__storage_test__";
    window.localStorage.setItem(key, key);
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
};

const storageAvailable = isStorageAvailable();

export const safeStorage = {
  getItem: (key) => {
    if (storageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn("localStorage.getItem failed, using memory fallback", e);
      }
    }
    return key in memoryStore ? memoryStore[key] : null;
  },
  setItem: (key, value) => {
    if (storageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn("localStorage.setItem failed, using memory fallback", e);
      }
    }
    memoryStore[key] = String(value);
  },
  removeItem: (key) => {
    if (storageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn("localStorage.removeItem failed, using memory fallback", e);
      }
    }
    delete memoryStore[key];
  },
  clear: () => {
    if (storageAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        console.warn("localStorage.clear failed, using memory fallback", e);
      }
    }
    for (const key in memoryStore) {
      delete memoryStore[key];
    }
  }
};

export default safeStorage;

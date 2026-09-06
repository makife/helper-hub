/**
 * Native WebView'de (özellikle Android) DOM Storage erişimi bazı cihazlarda
 * SecurityError fırlatabiliyor. Bu erişimler effect içinde yapıldığında React
 * hatayı ErrorBoundary'ye taşıyıp tüm uygulamayı "Bir şeyler ters gitti"
 * ekranına düşürüyor. Bu yüzden tüm storage erişimleri buradan geçmeli.
 */

const memoryStore = new Map<string, string>();

const readFrom = (store: Storage | undefined, key: string) => {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
};

const writeTo = (store: Storage | undefined, key: string, value: string) => {
  try {
    store?.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
};

const removeFrom = (store: Storage | undefined, key: string) => {
  try {
    store?.removeItem(key);
  } catch {
    /* yoksay */
  }
  memoryStore.delete(key);
};

const session = () => {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

const local = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export const safeSession = {
  get: (key: string) => readFrom(session(), key),
  set: (key: string, value: string) => writeTo(session(), key, value),
  remove: (key: string) => removeFrom(session(), key),
};

export const safeLocal = {
  get: (key: string) => readFrom(local(), key),
  set: (key: string, value: string) => writeTo(local(), key, value),
  remove: (key: string) => removeFrom(local(), key),
};

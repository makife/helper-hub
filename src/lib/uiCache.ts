/**
 * Basit bellek içi önbellek: ekranlar arası geçişte önceki veriyi anında
 * gösterip arka planda sessizce tazelemek için kullanılır.
 * Oturum süresince yaşar, sayfa yenilenince sıfırlanır.
 */
const store = new Map<string, unknown>();

export const getCache = <T,>(key: string): T | undefined => store.get(key) as T | undefined;

export const setCache = <T,>(key: string, value: T) => {
  store.set(key, value);
};

export const clearCache = (key?: string) => {
  if (key) store.delete(key);
  else store.clear();
};

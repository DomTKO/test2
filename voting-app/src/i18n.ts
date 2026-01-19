import { createI18n } from 'vue-i18n';
import de from './i18n/de.json';
import en from './i18n/en.json';

function readCookie(name: string) {
  return document.cookie.split('; ').find(c => c.startsWith(name + '='))?.split('=')[1];
}

export const i18n = createI18n({
  legacy: false,
  locale: 'de',
  fallbackLocale: 'de',
  messages: { de, en }
});



export async function initLocale() {
  // Cookie vorhanden?
  const cookieLang = readCookie('lang');
  if (cookieLang) {
    i18n.global.locale.value = (cookieLang.slice(0, 5)=="de")?"de":"en";
    return;
  }
  // Sonst Default aus API holen
  try {
    const r = await fetch('http://localhost:8082/config/defaults', { credentials: 'include' });
    if (r.ok) {
      const { defaultLanguage } = await r.json();
      i18n.global.locale.value = (String(defaultLanguage || 'de').slice(0, 5) =="de"?"de":"en");
    } else {
      i18n.global.locale.value = 'de';
    }
  } catch {
    i18n.global.locale.value = 'de';
  }
}

const SETTINGS_KEY = 'burner_settings';

export interface AppSettings {
  twilioAccountSid: string;
  twilioAuthToken: string;
  defaultCountry: string;
  pollingInterval: number;
}

const DEFAULTS: AppSettings = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  defaultCountry: 'AU',
  pollingInterval: 10000,
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('burner-settings-changed'));
  return merged;
}

export function hasCredentials(): boolean {
  const s = getSettings();
  return !!(s.twilioAccountSid && s.twilioAuthToken);
}

export function getCredentials(): { sid: string; token: string } {
  const s = getSettings();
  return { sid: s.twilioAccountSid, token: s.twilioAuthToken };
}

// Local, persisted app preferences (not identity-related, unlike authService).

const FONT_SCALE_KEY = 'app_font_scale';
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_DEFAULT = 1;

export function getFontScale(): number {
  if (typeof window === 'undefined') return FONT_SCALE_DEFAULT;
  const stored = Number(localStorage.getItem(FONT_SCALE_KEY));
  if (!stored || Number.isNaN(stored)) return FONT_SCALE_DEFAULT;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stored));
}

export function setFontScale(scale: number) {
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, scale));
  localStorage.setItem(FONT_SCALE_KEY, String(clamped));
  applyFontScale(clamped);
}

export function applyFontScale(scale: number) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--app-font-scale', String(scale));
}

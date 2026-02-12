/**
 * Data name localization helper.
 * Provides localizedName() to translate Chinese game data names
 * (cities, officers, factions) to the current locale.
 *
 * In zh-TW the original Chinese name is returned.
 * In English, romanized/English names are returned from the lookup maps.
 */
import i18next from 'i18next';
import citiesData from '../../data/cities.json';
import officersData from '../../data/rtk4_officers_zh.json';

/** zh -> en lookup for city names */
const cityNameMap: Record<string, string> = Object.fromEntries(
  citiesData.map(c => [c.name_zh, c.name_en])
);

/** zh -> en lookup for officer names */
const officerNameMap: Record<string, string> = Object.fromEntries(
  officersData.map(o => [o.name_zh, o.name_en])
);

/**
 * Return the localized display name for a Chinese game-data name.
 * Works for city names, officer names, and faction names (which are ruler names).
 *
 * @param zhName - The Chinese name stored on the data object (.name field)
 * @returns The translated name in the current locale
 */
export function localizedName(zhName: string): string {
  if (i18next.language === 'zh-TW') return zhName;
  return cityNameMap[zhName] ?? officerNameMap[zhName] ?? zhName;
}

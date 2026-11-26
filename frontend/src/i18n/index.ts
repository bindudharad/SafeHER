import { en } from './locales/en'
import { kn } from './locales/kn'
import { hi } from './locales/hi'
import type { Language, TranslationDictionary } from './translationKeys'

export type { Language, TranslationDictionary }

export const translations: Record<Language, TranslationDictionary> = {
  en,
  kn,
  hi,
}

export function flattenTranslationKeys(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenTranslationKeys(value as Record<string, unknown>, fullKey))
    } else if (typeof value === 'string') {
      result[fullKey] = value
    }
  }
  return result
}

export function getMissingTranslationKeys(lang: Language): string[] {
  const baseKeys = Object.keys(flattenTranslationKeys(en as unknown as Record<string, unknown>))
  const targetFlat = flattenTranslationKeys(
    translations[lang] as unknown as Record<string, unknown>
  )
  return baseKeys.filter((k) => !targetFlat[k] || targetFlat[k].trim() === '')
}

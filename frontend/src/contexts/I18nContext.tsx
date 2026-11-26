import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Language, type TranslationDictionary } from '../i18n/translations'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationDictionary
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const LANGUAGE_KEY = 'safeher_preferred_language'

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY) as Language
    return saved === 'kn' || saved === 'hi' || saved === 'en' ? saved : 'en'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_KEY, lang)
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = translations[language] || translations.en

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export const useOptionalI18n = (): I18nContextType => {
  const context = useContext(I18nContext)
  return (
    context ?? {
      language: 'en',
      setLanguage: () => undefined,
      t: translations.en,
    }
  )
}

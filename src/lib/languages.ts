/** Interface languages offered by the language switcher */
export const LANGUAGES = [
  { code: "en", english: "English", native: "English" },
  { code: "hi", english: "Hindi", native: "हिन्दी" },
  { code: "mr", english: "Marathi", native: "मराठी" },
  { code: "bn", english: "Bengali", native: "বাংলা" },
  { code: "ta", english: "Tamil", native: "தமிழ்" },
  { code: "te", english: "Telugu", native: "తెలుగు" },
  { code: "gu", english: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", english: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", english: "Malayalam", native: "മലയാളം" },
  { code: "pa", english: "Punjabi", native: "ਪੰਜਾਬੀ" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

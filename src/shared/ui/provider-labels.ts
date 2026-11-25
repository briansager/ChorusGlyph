const languageNames: Record<string, string> = {
  'japanese-kuroshiro': 'Japanese — Kuroshiro + Kuromoji',
  'chinese-pinyin-pro': 'Chinese — Pinyin Pro',
  'korean-local': 'Korean — Korean Romanization',
  'azure-transliteration': 'Thai — Azure Transliteration',
}

export function languageProviderLabel(id: string, fallback: string): string {
  return languageNames[id] ?? fallback
}

export type JapaneseConverterOptions = {
  to: 'romaji'
  romajiSystem: 'hepburn'
}

export type JapaneseKuroshiroConverter = {
  init(analyzer: JapaneseKuromojiAnalyzer): Promise<void>
  convert(text: string, options: JapaneseConverterOptions): Promise<string>
}

export type JapaneseKuromojiAnalyzer = {
  init(): Promise<void>
  parse(text: string): Promise<unknown>
}

export type JapaneseRomanizerDependencies = {
  createConverter?: () => JapaneseKuroshiroConverter
  createAnalyzer?: (options: { dictPath: string }) => JapaneseKuromojiAnalyzer
  dictPath?: string
}

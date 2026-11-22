declare module 'kuroshiro' {
  type KuroshiroAnalyzer = {
    init(): Promise<void>
    parse(text: string): Promise<unknown>
  }

  type KuroshiroOptions = {
    to: 'romaji'
    romajiSystem: 'hepburn'
  }

  class Kuroshiro {
    init(analyzer: KuroshiroAnalyzer): Promise<void>
    convert(text: string, options: KuroshiroOptions): Promise<string>
  }

  export default Kuroshiro
}

declare module 'kuroshiro-analyzer-kuromoji/dist/kuroshiro-analyzer-kuromoji.js' {
  class KuromojiAnalyzer {
    constructor(options?: { dictPath?: string })
    init(): Promise<void>
    parse(text: string): Promise<unknown>
  }

  export default KuromojiAnalyzer
}

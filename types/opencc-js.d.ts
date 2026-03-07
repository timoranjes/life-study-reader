/**
 * Type declarations for opencc-js
 * 
 * opencc-js is a JavaScript library for converting between Traditional and Simplified Chinese.
 * @see https://github.com/nk2028/opencc-js
 */

declare module "opencc-js" {
  /**
   * Conversion options for the Converter function
   */
  interface ConverterOptions {
    /** Source variant (e.g., 'cn', 'tw', 'hk', 't', 'jp') */
    from: string
    /** Target variant (e.g., 'cn', 'tw', 'hk', 't', 'jp') */
    to: string
  }

  /**
   * Converter function type
   */
  type ConverterFunction = (text: string) => string

  /**
   * Creates a converter function for Chinese text conversion
   * 
   * @param options - Conversion options specifying source and target variants
   * @returns A function that converts text from source to target variant
   * 
   * @example
   * ```typescript
   * import { Converter } from 'opencc-js'
   * 
   * // Convert from Hong Kong Traditional to Mainland Simplified
   * const hkToCn = Converter({ from: 'hk', to: 'cn' })
   * const simplified = hkToCn('繁體中文') // '繁体中文'
   * 
   * // Convert from Mainland Simplified to Taiwan Traditional
   * const cnToTw = Converter({ from: 'cn', to: 'tw' })
   * const traditional = cnToTw('简体中文') // '簡體中文'
   * ```
   */
  export function Converter(options: ConverterOptions): ConverterFunction

  /**
   * Pre-defined conversion variants
   */
  export const variants: {
    /** Mainland China Simplified Chinese */
    cn: string
    /** Taiwan Traditional Chinese */
    tw: string
    /** Hong Kong Traditional Chinese */
    hk: string
    /** Traditional Chinese (generic) */
    t: string
    /** Japanese Kanji */
    jp: string
  }
}
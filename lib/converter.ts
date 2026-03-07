/**
 * 繁简转换器
 * 
 * 这是一个重导出文件，实际的转换逻辑在 chinese-converter.ts 中实现。
 * 保留此文件是为了向后兼容。
 * 
 * @example
 * ```typescript
 * import { toSimplified, toTraditional } from "@/lib/converter"
 * 
 * const simplified = toSimplified("繁體中文")  // "繁体中文"
 * const traditional = toTraditional("简体中文")  // "簡體中文"
 * ```
 */

// 重导出新的转换器功能
export {
  ChineseConverter,
  toSimplified,
  toTraditional,
  createConverter,
  convertReadingData,
  type ConverterConfig,
  type ReadingData,
  type ReadingMessage,
  type ReadingContent,
} from "./chinese-converter"

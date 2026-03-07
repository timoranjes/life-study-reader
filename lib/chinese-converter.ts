/**
 * 繁简转换动态修正系统
 * 
 * 功能：
 * 1. 基于开放中文转换（opencc-js）进行基础繁简转换
 * 2. 修正一对多映射错误
 * 3. 标准化异体字
 * 4. 处理语境相关转换
 * 5. 保留专有名词和特殊用法
 */

import { Converter } from "opencc-js"

// ============================================================================
// 转换规则定义
// ============================================================================

/**
 * 一对多映射修正规则
 * 这些词汇在标准繁简转换中会出错，需要特殊处理
 */
const ONE_TO_MANY_FIXES: Record<string, string> = {
  // "著" → "着" 的修正（介词/助词用法）
  "為著": "为着",
  "为著": "为着",
  
  // "甚麼/甚么" → "什么" 的修正
  "甚麼": "什么",
  "甚么": "什么",
  
  // 其他常见一对多错误
  "乾淨": "干净",
  "乾燥": "干燥",
  "乾坤": "乾坤",  // 保留
  "皇後": "皇后",
  "後来": "后来",
  "後面": "后面",
}

/**
 * 异体字标准化映射
 * 将不常用的异体字转换为标准简体字
 */
const VARIANT_TO_STANDARD: Record<string, string> = {
  "彀": "够",
  "纔": "才",
  "喫": "吃",
  "迴": "回",
  "甦": "苏",
  "籲": "吁",
  "罷": "罢",
  "佈": "布",
  "並": "并",
  "佔": "占",
  "姦": "奸",
  "蹟": "迹",
  "鑑": "鉴",
  "籤": "签",
  "蹓": "溜",
  "髮": "发",  // 头发
  "裏": "里",
  "啟": "启",
  "牠": "它",  // 注意：圣经语境中可能需要保留
}

/**
 * 词汇标准化映射
 * 针对特定领域的术语进行标准化
 */
const VOCABULARY_STANDARDIZATION: Record<string, string> = {
  // "豫" → "预" 系列（宗教文本常用）
  "豫表": "预表",
  "豫备": "预备",
  "豫言": "预言",
  "豫定": "预定",
  "豫防": "预防",
  "豫先": "预先",
  
  // 其他词汇标准化
  "榮燿": "荣耀",
  "爭戰": "争战",  // 宗教语境可保留
  "表顯": "表显",
  "顯出": "显出",
  "構成": "构成",
  "搆成": "构成",
}

/**
 * 语境相关转换规则
 * 使用正则表达式进行上下文匹配
 */
interface ContextRule {
  pattern: RegExp
  replacement: string
  description: string
}

const CONTEXT_RULES: ContextRule[] = [
  // "著" 字处理：
  // 作为助词时转换为"着"，但保留"著作"、"著名"、"著书"等词
  // 使用更简单的策略：在以下情况保留"著"，其他情况转换为"着"
  
  // 1. 保留"著作"、"著名"、"著书"、"显著"、"著述"等词
  // 先用占位符保护这些词
  {
    pattern: /(著)(作|名|书|述|称|录|者|意)/g,
    replacement: "\x00$1$2\x00",
    description: '保护"著作"、"著名"等词',
  },
  
  // 2. 其他所有"著"转换为"着"
  {
    pattern: /著/g,
    replacement: "着",
    description: "剩余的著转换为着",
  },
  
  // 3. 还原保护的词
  {
    pattern: /\x00(著作|著名|著书|著述|著称|著录|著者|著意)\x00/g,
    replacement: "$1",
    description: "还原保护的词",
  },
  
  // 彀 → 够（但保留"彀中"等特殊用法）
  {
    pattern: /彀(?!中)/g,
    replacement: "够",
    description: '非"彀中"情况下的"彀"转换为"够"',
  },
]

/**
 * 保留词列表
 * 这些词汇在特定语境下应保持原样，不做转换
 */
const PRESERVED_WORDS = new Set([
  // 圣经/宗教专有名词
  "彀中",      // 特殊用法，保留
  "耶和華",    // 神名
  "哈利路亞",  // 赞美词
  "阿們",      // 使用简体"阿们"
  "以馬內利",  // 保留传统写法
  
  // 可根据需要添加更多保留词
])

/**
 * 不转换的字符集
 * 某些字符在特定语境下需要保留繁体写法
 */
const PRESERVED_CHARS = new Set([
  // 暂无，可根据需要添加
])

// ============================================================================
// 转换器类
// ============================================================================

/**
 * 繁简转换配置
 */
export interface ConverterConfig {
  /** 是否启用一对多修正 */
  enableOneToManyFix?: boolean
  /** 是否启用异体字标准化 */
  enableVariantStandardization?: boolean
  /** 是否启用词汇标准化 */
  enableVocabularyStandardization?: boolean
  /** 是否启用语境规则 */
  enableContextRules?: boolean
  /** 是否保留"牠"字（圣经语境中常指魔鬼） */
  preserveTaChar?: boolean
  /** 调试模式 */
  debug?: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ConverterConfig> = {
  enableOneToManyFix: true,
  enableVariantStandardization: true,
  enableVocabularyStandardization: true,
  enableContextRules: true,
  preserveTaChar: true,  // 默认保留"牠"字
  debug: false,
}

/**
 * 中文繁简转换器
 * 
 * 使用方法：
 * ```typescript
 * const converter = new ChineseConverter()
 * const simplified = converter.toSimplified("我們為著聖經讚美主！")
 * // 输出: "我们为着圣经赞美主！"
 * ```
 */
export class ChineseConverter {
  private config: Required<ConverterConfig>
  private baseConverter: (text: string) => string
  private reverseConverter: (text: string) => string
  
  constructor(config: ConverterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // 初始化 opencc-js 转换器
    // 使用 hk（香港繁体）到 cn（大陆简体）的转换
    this.baseConverter = Converter({ from: "hk", to: "cn" })
    this.reverseConverter = Converter({ from: "cn", to: "hk" })
  }
  
  /**
   * 将繁体中文转换为简体中文
   * @param text 繁体中文文本
   * @returns 简体中文文本
   */
  toSimplified(text: string): string {
    if (!text) return ""
    
    let result = text
    
    // 步骤1: 基础繁简转换
    result = this.baseConverter(result)
    
    // 步骤2: 一对多映射修正
    if (this.config.enableOneToManyFix) {
      result = this.applyOneToManyFixes(result)
    }
    
    // 步骤3: 异体字标准化
    if (this.config.enableVariantStandardization) {
      result = this.applyVariantStandardization(result)
    }
    
    // 步骤4: 词汇标准化
    if (this.config.enableVocabularyStandardization) {
      result = this.applyVocabularyStandardization(result)
    }
    
    // 步骤5: 语境相关转换
    if (this.config.enableContextRules) {
      result = this.applyContextRules(result)
    }
    
    // 步骤6: 还原保留词
    result = this.restorePreservedWords(result, text)
    
    if (this.config.debug) {
      console.log("[ChineseConverter] Conversion result:", {
        original: text.substring(0, 50) + "...",
        result: result.substring(0, 50) + "...",
      })
    }
    
    return result
  }
  
  /**
   * 将简体中文转换为繁体中文
   * @param text 简体中文文本
   * @returns 繁体中文文本
   */
  toTraditional(text: string): string {
    if (!text) return ""
    return this.reverseConverter(text)
  }
  
  /**
   * 应用一对多映射修正
   */
  private applyOneToManyFixes(text: string): string {
    let result = text
    for (const [source, target] of Object.entries(ONE_TO_MANY_FIXES)) {
      // 使用分割替换避免正则特殊字符问题
      result = result.split(source).join(target)
    }
    return result
  }
  
  /**
   * 应用异体字标准化
   */
  private applyVariantStandardization(text: string): string {
    let result = text
    
    // 处理"牠"字
    if (this.config.preserveTaChar) {
      // 保留"牠"字，跳过转换
      const taPlaceholder = "\x00TA\x00"
      result = result.split("牠").join(taPlaceholder)
      
      // 应用其他异体字转换
      for (const [source, target] of Object.entries(VARIANT_TO_STANDARD)) {
        if (source !== "牠") {
          result = result.split(source).join(target)
        }
      }
      
      // 还原"牠"字
      result = result.split(taPlaceholder).join("牠")
    } else {
      // 不保留"牠"字，全部转换
      for (const [source, target] of Object.entries(VARIANT_TO_STANDARD)) {
        result = result.split(source).join(target)
      }
    }
    
    return result
  }
  
  /**
   * 应用词汇标准化
   */
  private applyVocabularyStandardization(text: string): string {
    let result = text
    for (const [source, target] of Object.entries(VOCABULARY_STANDARDIZATION)) {
      result = result.split(source).join(target)
    }
    return result
  }
  
  /**
   * 应用语境相关规则
   */
  private applyContextRules(text: string): string {
    let result = text
    for (const rule of CONTEXT_RULES) {
      try {
        result = result.replace(rule.pattern, rule.replacement)
      } catch (error) {
        if (this.config.debug) {
          console.warn(`[ChineseConverter] Rule failed: ${rule.description}`, error)
        }
      }
    }
    return result
  }
  
  /**
   * 还原保留词
   * 确保某些特殊词汇不被错误转换
   */
  private restorePreservedWords(result: string, original: string): string {
    // 检查保留词是否在原文中存在
    for (const word of PRESERVED_WORDS) {
      if (original.includes(word)) {
        // 在结果中还原该词
        const simplifiedWord = this.baseConverter(word)
        result = result.split(simplifiedWord).join(word)
      }
    }
    return result
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

// 默认转换器实例
let defaultConverter: ChineseConverter | null = null

/**
 * 获取默认转换器实例（延迟初始化）
 */
function getDefaultConverter(): ChineseConverter {
  if (!defaultConverter) {
    defaultConverter = new ChineseConverter()
  }
  return defaultConverter
}

/**
 * 将繁体中文转换为简体中文（使用默认配置）
 * @param text 繁体中文文本
 * @returns 简体中文文本
 */
export function toSimplified(text: string): string {
  return getDefaultConverter().toSimplified(text)
}

/**
 * 将简体中文转换为繁体中文（使用默认配置）
 * @param text 简体中文文本
 * @returns 繁体中文文本
 */
export function toTraditional(text: string): string {
  return getDefaultConverter().toTraditional(text)
}

/**
 * 创建自定义转换器
 * @param config 转换配置
 * @returns 转换器实例
 */
export function createConverter(config: ConverterConfig): ChineseConverter {
  return new ChineseConverter(config)
}

// ============================================================================
// 转换数据内容
// ============================================================================

/**
 * 阅读数据内容接口
 */
export interface ReadingContent {
  type: string
  text: string
}

export interface ReadingMessage {
  id: string
  title: string
  content: ReadingContent[]
}

export interface ReadingData {
  bookId: string
  bookName: string
  messages: ReadingMessage[]
}

/**
 * 转换阅读数据
 * 递归处理数据对象中的所有文本内容
 */
export function convertReadingData(data: ReadingData, converter?: ChineseConverter): ReadingData {
  const conv = converter || getDefaultConverter()
  
  return {
    bookId: data.bookId,
    bookName: conv.toSimplified(data.bookName),
    messages: data.messages.map(message => ({
      id: message.id,
      title: conv.toSimplified(message.title),
      content: message.content.map(item => ({
        type: item.type,
        text: conv.toSimplified(item.text),
      })),
    })),
  }
}

// ============================================================================
// 导出
// ============================================================================

export default {
  ChineseConverter,
  toSimplified,
  toTraditional,
  createConverter,
  convertReadingData,
}
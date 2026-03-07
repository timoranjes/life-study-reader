# 繁简转换动态修正系统

## 概述

本系统在运行时动态将繁体中文文本转换为标准简体中文，同时修正常见的转换遗留问题，确保文本符合标准简体中文语境与表达习惯。

## 功能特性

- ✅ 基于开放中文转换（opencc-js）进行基础繁简转换
- ✅ 修正一对多映射错误（如：為著 → 为着）
- ✅ 异体字标准化（如：彀 → 够、纔 → 才）
- ✅ 词汇标准化（如：豫表 → 预表）
- ✅ 语境相关转换（如：动词后的"著" → "着"）
- ✅ 保留专有名词和特殊用法
- ✅ 可配置的转换规则

## 快速开始

### 基础使用

```typescript
import { toSimplified, toTraditional } from "@/lib/chinese-converter"

// 繁体转简体
const simplified = toSimplified("我們為著聖經讚美主！")
// 输出: "我们为着圣经赞美主！"

// 简体转繁体
const traditional = toTraditional("我们赞美主")
// 输出: "我們讚美主"
```

### 自定义配置

```typescript
import { createConverter } from "@/lib/chinese-converter"

const converter = createConverter({
  // 是否启用一对多修正（默认: true）
  enableOneToManyFix: true,
  
  // 是否启用异体字标准化（默认: true）
  enableVariantStandardization: true,
  
  // 是否启用词汇标准化（默认: true）
  enableVocabularyStandardization: true,
  
  // 是否启用语境规则（默认: true）
  enableContextRules: true,
  
  // 是否保留"牠"字（默认: true，圣经语境中常指魔鬼）
  preserveTaChar: true,
  
  // 调试模式（默认: false）
  debug: false,
})

const result = converter.toSimplified("繁體文本")
```

### 转换阅读数据

```typescript
import { convertReadingData, ReadingData } from "@/lib/chinese-converter"

const traditionalData: ReadingData = {
  bookId: "1",
  bookName: "創世記",
  messages: [
    {
      id: "1",
      title: "第一篇",
      content: [{ type: "p", text: "繁體內容" }]
    }
  ]
}

const simplifiedData = convertReadingData(traditionalData)
// simplifiedData.bookName === "创世记"
```

## 转换规则

### 1. 一对多映射修正

| 繁体 | 错误转换 | 正确转换 |
|------|----------|----------|
| 為著 | 为著 | **为着** |
| 甚麼 | 甚么 | **什么** |

### 2. 异体字标准化

| 异体字 | 标准简体 |
|--------|----------|
| 彀 | 够 |
| 纔 | 才 |
| 喫 | 吃 |
| 迴 | 回 |
| 甦 | 苏 |
| 籲 | 吁 |
| 罷 | 罢 |

### 3. 词汇标准化

| 原词 | 标准简体 |
|------|----------|
| 豫表 | 预表 |
| 豫备 | 预备 |
| 豫言 | 预言 |
| 豫定 | 预定 |
| 豫防 | 预防 |
| 豫先 | 预先 |

### 4. 语境相关转换

- **"著"字处理**：动词后的"著"转换为"着"
  - 說著 → 说着
  - 看著 → 看着
  - 得著 → 得着
  - 保留：著作、著名、著书等

- **"牠"字处理**：可配置保留或转换
  - 默认保留：牠是魔鬼 → 牠是魔鬼（圣经语境）
  - 可配置转换：牠 → 它

## 架构设计

### 重要：客户端动态转换

**服务器端保留原始繁体数据**，转换在客户端根据用户的语言设置动态执行。这确保用户可以在繁体/简体之间自由切换。

```
┌─────────────────────────────────────────────────────────┐
│                    数据流程                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   JSON 数据文件 (繁体)                                   │
│         │                                                │
│         ▼                                                │
│   ┌─────────────────┐                                   │
│   │  Reader Page    │  服务器端：直接传递原始数据        │
│   │  (Server)       │  app/reader/[bookId]/page.tsx    │
│   └────────┬────────┘                                   │
│            │ 原始繁体数据                                │
│            ▼                                             │
│   ┌─────────────────┐                                   │
│   │  Reader         │  客户端：根据语言设置动态转换      │
│   │  (Client)       │  components/reader/reader.tsx    │
│   └────────┬────────┘                                   │
│            │                                             │
│            ▼                                             │
│   ┌─────────────────────────────────────┐               │
│   │  useLanguage Hook                   │               │
│   │  - 读取 localStorage 语言设置       │               │
│   │  - language === 'simplified' ?      │               │
│   │      toSimplified(text) : text      │               │
│   └─────────────────────────────────────┘               │
│                                                          │
│   结果：                                                 │
│   - 繁体模式：显示原始繁体                               │
│   - 简体模式：运行时转换为简体                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 关键代码位置

**服务器端** ([`app/reader/[bookId]/page.tsx`](app/reader/[bookId]/page.tsx)):
```typescript
// 保留原始繁体数据，由客户端根据语言设置动态转换
const bookData = JSON.parse(fileContent)  // 不做转换
return <Reader bookData={bookData} ... />
```

**客户端** ([`components/reader/reader.tsx`](components/reader/reader.tsx)):
```typescript
const { language, toSimplified } = useLanguage()

// 根据语言设置动态转换
const displayContent = currentMessage?.content?.map((c) =>
  language === "simplified" ? toSimplified(c.text) : c.text
)
```

## 文件结构

```
lib/
├── chinese-converter.ts    # 主转换器模块
├── converter.ts            # 重导出文件（向后兼容）

types/
└── opencc-js.d.ts          # opencc-js 类型声明

scripts/
└── test-converter.ts       # 转换测试脚本

app/reader/[bookId]/
└── page.tsx                # 集成点：数据加载时转换
```

## 性能考虑

1. **延迟初始化**：默认转换器实例使用延迟初始化，避免不必要的内存占用
2. **规则顺序优化**：规则按影响范围从大到小执行，减少重复处理
3. **无缓存策略**：由于 Next.js 的数据缓存机制，运行时转换不需要额外缓存

## 扩展规则

如需添加新的转换规则，编辑 [`lib/chinese-converter.ts`](lib/chinese-converter.ts)：

```typescript
// 添加一对多修正
const ONE_TO_MANY_FIXES: Record<string, string> = {
  // ... 现有规则
  "新词": "修正后",
}

// 添加异体字
const VARIANT_TO_STANDARD: Record<string, string> = {
  // ... 现有规则
  "异体字": "标准字",
}

// 添加词汇标准化
const VOCABULARY_STANDARDIZATION: Record<string, string> = {
  // ... 现有规则
  "原词汇": "标准化词汇",
}
```

## 运行测试

```bash
npx tsx scripts/test-converter.ts
```

## 依赖

- `opencc-js`: 开放中文转换库，提供基础繁简转换功能
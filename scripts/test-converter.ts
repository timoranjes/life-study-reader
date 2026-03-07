/**
 * 繁简转换器验证脚本
 * 
 * 运行方式：npx ts-node scripts/test-converter.ts
 * 或者：node --loader ts-node/esm scripts/test-converter.ts
 */

import {
  ChineseConverter,
  toSimplified,
  toTraditional,
  createConverter,
} from "../lib/chinese-converter"

// 测试用例定义
interface TestCase {
  name: string
  input: string
  expected: string
}

const testCases: TestCase[] = [
  // 基础繁简转换
  { name: "基础转换-繁体到简体", input: "繁體中文", expected: "繁体中文" },
  { name: "基础转换-我们", input: "我們", expected: "我们" },
  { name: "基础转换-圣经", input: "聖經", expected: "圣经" },
  { name: "基础转换-赞美主", input: "讚美主", expected: "赞美主" },
  
  // 一对多映射修正
  { name: "一对多-为着", input: "為著", expected: "为着" },
  { name: "一对多-什么", input: "甚麼", expected: "什么" },
  { name: "一对多-什么2", input: "甚么", expected: "什么" },
  
  // 异体字标准化
  { name: "异体字-够", input: "彀用", expected: "够用" },
  { name: "异体字-才", input: "纔能", expected: "才能" },
  { name: "异体字-吃", input: "喫饭", expected: "吃饭" },
  { name: "异体字-回", input: "迴转", expected: "回转" },
  { name: "异体字-苏", input: "復甦", expected: "复苏" },
  
  // 词汇标准化
  { name: "词汇-预表", input: "豫表", expected: "预表" },
  { name: "词汇-预备", input: "豫备", expected: "预备" },
  { name: "词汇-预言", input: "豫言", expected: "预言" },
  { name: "词汇-预定", input: "豫定", expected: "预定" },
  
  // 语境相关
  { name: "语境-说着", input: "說著", expected: "说着" },
  { name: "语境-看着", input: "看著", expected: "看着" },
  
  // 综合测试
  {
    name: "综合句子",
    input: "我們為著聖經讚美主！這是甚麼？能彀使我們得著生命。",
    expected: "我们为着圣经赞美主！这是什么？能够使我们得着生命。"
  },
  {
    name: "宗教文本",
    input: "基督是神的兒子，祂為著我們的罪被釘十字架。",
    expected: "基督是神的儿子，祂为着我们的罪被钉十字架。"
  },
]

// 运行测试
function runTests(): void {
  console.log("=" .repeat(60))
  console.log("繁简转换器验证测试")
  console.log("=" .repeat(60))
  console.log()
  
  let passed = 0
  let failed = 0
  
  for (const test of testCases) {
    const result = toSimplified(test.input)
    const success = result === test.expected
    
    if (success) {
      passed++
      console.log(`✅ 通过: ${test.name}`)
    } else {
      failed++
      console.log(`❌ 失败: ${test.name}`)
      console.log(`   输入:   ${test.input}`)
      console.log(`   期望:   ${test.expected}`)
      console.log(`   实际:   ${result}`)
    }
  }
  
  console.log()
  console.log("=" .repeat(60))
  console.log(`测试结果: ${passed} 通过, ${failed} 失败`)
  console.log("=" .repeat(60))
  
  // 展示一些转换示例
  console.log()
  console.log("转换示例:")
  console.log("-" .repeat(40))
  
  const examples = [
    "創世記生命讀經 第一篇",
    "我們為著聖經讚美主！",
    "這是甚麼豫言？",
    "能彀彀用，纔是真的",
    "基督徒應當豫備自己，喫主的晚餐",
  ]
  
  for (const ex of examples) {
    console.log(`繁: ${ex}`)
    console.log(`简: ${toSimplified(ex)}`)
    console.log()
  }
  
  // 测试自定义配置
  console.log("-" .repeat(40))
  console.log("自定义配置测试:")
  console.log("-" .repeat(40))
  
  // 保留"牠"字的转换
  const preserveTaConverter = createConverter({ preserveTaChar: true })
  console.log(`保留"牠"字:`)
  console.log(`  输入: 牠是魔鬼`)
  console.log(`  结果: ${preserveTaConverter.toSimplified("牠是魔鬼")}`)
  console.log()
  
  // 不保留"牠"字的转换
  const noPreserveTaConverter = createConverter({ preserveTaChar: false })
  console.log(`不保留"牠"字:`)
  console.log(`  输入: 牠是魔鬼`)
  console.log(`  结果: ${noPreserveTaConverter.toSimplified("牠是魔鬼")}`)
}

// 执行测试
runTests()
import { Converter } from "opencc-js"

const hkToCn = Converter({ from: "hk", to: "cn" })
const cnToHk = Converter({ from: "cn", to: "hk" })

export function toSimplified(text: string): string {
  if (!text) return ""
  return hkToCn(text)
}

export function toTraditional(text: string): string {
  if (!text) return ""
  return cnToHk(text)
}

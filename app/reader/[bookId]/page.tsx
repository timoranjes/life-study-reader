import fs from "fs/promises"
import path from "path"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Reader } from "@/components/reader/reader"

interface ReaderPageProps {
  params: Promise<{
    bookId: string
  }>
}

export async function generateStaticParams() {
  const dataDirectory = path.join(process.cwd(), "src", "data", "life-study")
  
  try {
    const files = await fs.readdir(dataDirectory)
    const bookIds = files
      .filter(file => file.endsWith('.json') && !file.includes('_') && file !== 'index.json')
      .map(file => file.replace('.json', ''))
      .sort((a, b) => parseInt(a) - parseInt(b))
    
    return bookIds.map(bookId => ({
      bookId
    }))
  } catch {
    // Fallback to common book IDs if directory read fails
    return Array.from({ length: 66 }, (_, i) => ({
      bookId: String(i + 1)
    }))
  }
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { bookId } = await params

  try {
    const filePath = path.join(process.cwd(), "src", "data", "life-study", `${bookId}.json`)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const bookData = JSON.parse(fileContent)

    if (!bookData || !bookData.bookId) {
      notFound()
    }

    // 保留原始繁体数据，由客户端根据语言设置动态转换
    // 这确保用户可以在繁体/简体之间自由切换

    let englishData: any | null = null
    try {
      const enPath = path.join(process.cwd(), "src", "data", "life-study", `${bookId}_en.json`)
      const enContent = await fs.readFile(enPath, "utf-8")
      englishData = JSON.parse(enContent)
    } catch {}

    return (
      <Suspense fallback={<div>Loading reader...</div>}>
        <Reader bookData={bookData} englishData={englishData} />
      </Suspense>
    )
  } catch {
    notFound()
  }
}

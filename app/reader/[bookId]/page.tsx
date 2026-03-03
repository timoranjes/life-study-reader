import fs from "fs/promises"
import path from "path"
import { notFound } from "next/navigation"
import { Reader } from "@/components/reader/reader"

interface ReaderPageProps {
  params: Promise<{
    bookId: string
  }>
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

    let englishData: any | null = null
    try {
      const enPath = path.join(process.cwd(), "src", "data", "life-study", `${bookId}_en.json`)
      const enContent = await fs.readFile(enPath, "utf-8")
      englishData = JSON.parse(enContent)
    } catch {}

    return <Reader bookData={bookData} englishData={englishData} />
  } catch {
    notFound()
  }
}

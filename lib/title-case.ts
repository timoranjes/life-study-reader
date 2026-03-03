// Title Case formatting for English titles
// Capitalizes first letter of each word except for certain small words (articles, prepositions, conjunctions)

const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by',
  'in', 'of', 'with', 'as', 'but', 'so', 'up', 'yet', 'is', 'it', 'its', 'from',
  'into', 'onto', 'upon', 'over', 'under', 'out', 'off', 'down', 'than', 'via'
])

export function toTitleCase(text: string): string {
  if (!text) return text
  
  const words = text.split(/\s+/)
  
  return words
    .map((word, index) => {
      // Always capitalize first and last word
      if (index === 0 || index === words.length - 1) {
        return capitalizeWord(word)
      }
      
      // Check if it's a small word (compare lowercase)
      const lowerWord = word.toLowerCase()
      if (SMALL_WORDS.has(lowerWord)) {
        return lowerWord
      }
      
      return capitalizeWord(word)
    })
    .join(' ')
}

function capitalizeWord(word: string): string {
  if (!word) return word
  
  // Handle words with apostrophes (e.g., "King's")
  // The part after apostrophe should stay lowercase (e.g., 's)
  const apostropheIndex = word.indexOf("'")
  if (apostropheIndex !== -1) {
    const beforeApostrophe = word.slice(0, apostropheIndex)
    const afterApostrophe = word.slice(apostropheIndex)
    
    // Capitalize first letter of the part before apostrophe
    const capitalized = beforeApostrophe.charAt(0).toUpperCase() + beforeApostrophe.slice(1).toLowerCase()
    // Keep everything after apostrophe lowercase
    const lowerAfter = afterApostrophe.toLowerCase()
    
    return capitalized + lowerAfter
  }
  
  // Regular word: capitalize first letter, lowercase rest
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

// Format English title with proper Title Case
export function formatEnglishTitle(title: string): string {
  if (!title) return title
  
  // Extract any trailing part numbers like "(1)", "(2)"
  const match = title.match(/^(.+?)((?:\s*\(\d+\))*)$/)
  if (!match) return toTitleCase(title)
  
  const mainTitle = match[1].trim()
  const partNumbers = match[2] || ''
  
  return toTitleCase(mainTitle) + partNumbers
}
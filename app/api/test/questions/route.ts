import { NextRequest, NextResponse } from 'next/server'
import testData from '../../../../data/Real_Estate_Tests_Merged.json'

type Question = {
  id: number
  question: string
  options: { key: string; text: string }[]
  correctOptionKey: string
}

type Category = {
  category: string
  questions: Question[]
}

const data = testData as { categories: Category[] }

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const categoriesParam = searchParams.get('categories')
  const countParam = searchParams.get('count')

  if (!categoriesParam) {
    return NextResponse.json({ error: 'Categories required' }, { status: 400 })
  }

  const selectedCategories = categoriesParam.split(',')
  const count = countParam ? parseInt(countParam, 10) : 20

  // Get questions from selected categories (without correct answer)
  const questions = data.categories
    .filter(cat => selectedCategories.includes(cat.category))
    .flatMap(cat =>
      cat.questions.map(q => ({
        id: q.id,
        category: cat.category,
        question: q.question,
        options: q.options
        // correctOptionKey is NOT included
      }))
    )

  // Shuffle and limit
  const shuffled = shuffle(questions).slice(0, count)

  return NextResponse.json({ questions: shuffled })
}

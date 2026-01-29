import { NextResponse } from 'next/server'
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

export async function GET() {
  const categories = data.categories.map(cat => ({
    name: cat.category,
    count: cat.questions.length
  }))

  return NextResponse.json({ categories })
}

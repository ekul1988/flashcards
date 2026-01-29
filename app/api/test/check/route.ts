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

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { category, questionId, selectedAnswer } = body

  if (!category || !questionId || !selectedAnswer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Find the question
  const categoryData = data.categories.find(cat => cat.category === category)
  if (!categoryData) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const question = categoryData.questions.find(q => q.id === questionId)
  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const correct = selectedAnswer === question.correctOptionKey

  return NextResponse.json({
    correct,
    correctAnswer: question.correctOptionKey
  })
}

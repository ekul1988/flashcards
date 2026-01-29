'use client'

import { useState, useEffect } from 'react'
import coreData from '../data/flashcards_core.json'
import acronymsData from '../data/flashcards_acronyms.json'

type Flashcard = {
  id: string
  question: string
  answer: string
}

type TestQuestion = {
  id: number
  question: string
  options: { key: string; text: string }[]
  category: string
}

type CategoryInfo = {
  name: string
  count: number
}

type CategoryResult = {
  name: string
  correct: number
  total: number
}

// Add prefix to IDs to make them unique across decks
const coreCards: Flashcard[] = coreData.map(card => ({
  ...card,
  id: `core-${card.id}`
}))

const acronymCards: Flashcard[] = acronymsData.map(card => ({
  ...card,
  id: `acronym-${card.id}`
}))

type Deck = 'core' | 'acronyms' | 'both'

function getDeckCards(deck: Deck): Flashcard[] {
  switch (deck) {
    case 'core': return coreCards
    case 'acronyms': return acronymCards
    case 'both': return [...coreCards, ...acronymCards]
  }
}

// Shuffle array using Fisher-Yates algorithm
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function Home() {
  // App mode: flashcards or test
  const [appMode, setAppMode] = useState<'select' | 'flashcards' | 'test'>('select')

  // Flashcard state
  const [deck, setDeck] = useState<Deck>('core')
  const [mode, setMode] = useState<'all' | 'wrong'>('all')
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [cardCount, setCardCount] = useState(20)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState({ right: 0, wrong: 0 })

  // Test state
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [testQuestionCount, setTestQuestionCount] = useState(20)
  const [testStarted, setTestStarted] = useState(false)
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([])
  const [testIndex, setTestIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [testAnswers, setTestAnswers] = useState<{ question: TestQuestion; selected: string; correct: boolean }[]>([])
  const [testComplete, setTestComplete] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  // Load wrong answers from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flashcards-wrong')
    if (saved) {
      setWrongIds(JSON.parse(saved))
    }
  }, [])

  // Save wrong answers to localStorage
  useEffect(() => {
    localStorage.setItem('flashcards-wrong', JSON.stringify(wrongIds))
  }, [wrongIds])

  const deckCards = getDeckCards(deck)
  const availableCards = mode === 'all'
    ? deckCards
    : deckCards.filter(card => wrongIds.includes(card.id))
  const maxCards = availableCards.length
  const deckWrongCount = wrongIds.filter(id =>
    deckCards.some(card => card.id === id)
  ).length

  // Adjust card count when deck/mode changes
  useEffect(() => {
    if (cardCount > maxCards) {
      setCardCount(Math.max(1, maxCards))
    }
  }, [maxCards, cardCount])

  const currentCard = shuffledCards[currentIndex]

  const startSession = () => {
    const cards = shuffle(availableCards).slice(0, cardCount)
    setShuffledCards(cards)
    setCurrentIndex(0)
    setShowAnswer(false)
    setSessionComplete(false)
    setSessionStats({ right: 0, wrong: 0 })
    setSessionStarted(true)
  }

  const handleAnswer = (correct: boolean) => {
    if (!currentCard) return

    if (correct) {
      setWrongIds(prev => prev.filter(id => id !== currentCard.id))
      setSessionStats(prev => ({ ...prev, right: prev.right + 1 }))
    } else {
      setWrongIds(prev => prev.includes(currentCard.id) ? prev : [...prev, currentCard.id])
      setSessionStats(prev => ({ ...prev, wrong: prev.wrong + 1 }))
    }

    if (currentIndex + 1 >= shuffledCards.length) {
      setSessionComplete(true)
    } else {
      setCurrentIndex(prev => prev + 1)
      setShowAnswer(false)
    }
  }

  const endSession = () => {
    setSessionStarted(false)
    setSessionComplete(false)
  }

  const restartSession = () => {
    startSession()
  }

  const switchDeck = (newDeck: Deck) => {
    setDeck(newDeck)
    setMode('all')
  }

  const switchMode = (newMode: 'all' | 'wrong') => {
    setMode(newMode)
  }

  const clearWrongAnswers = () => {
    const deckCardIds = deckCards.map(c => c.id)
    setWrongIds(prev => prev.filter(id => !deckCardIds.includes(id)))
  }

  // Fetch test categories on mount
  useEffect(() => {
    fetch('/api/test/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories)
        setSelectedCategories(data.categories.map((c: CategoryInfo) => c.name))
      })
  }, [])

  // Test functions
  const maxTestQuestions = categories
    .filter(c => selectedCategories.includes(c.name))
    .reduce((sum, c) => sum + c.count, 0)

  useEffect(() => {
    if (testQuestionCount > maxTestQuestions && maxTestQuestions > 0) {
      setTestQuestionCount(Math.max(1, maxTestQuestions))
    }
  }, [maxTestQuestions, testQuestionCount])

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const selectAllCategories = () => setSelectedCategories(categories.map(c => c.name))
  const clearAllCategories = () => setSelectedCategories([])

  const startTest = async () => {
    setTestLoading(true)
    try {
      const params = new URLSearchParams({
        categories: selectedCategories.join(','),
        count: testQuestionCount.toString()
      })
      const res = await fetch(`/api/test/questions?${params}`)
      const data = await res.json()
      setTestQuestions(data.questions)
      setTestIndex(0)
      setSelectedAnswer(null)
      setCorrectAnswer(null)
      setAnswerRevealed(false)
      setTestAnswers([])
      setTestComplete(false)
      setTestStarted(true)
    } finally {
      setTestLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (!selectedAnswer) return
    const currentQuestion = testQuestions[testIndex]

    const res = await fetch('/api/test/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: currentQuestion.category,
        questionId: currentQuestion.id,
        selectedAnswer
      })
    })
    const data = await res.json()

    setCorrectAnswer(data.correctAnswer)
    setTestAnswers(prev => [...prev, { question: currentQuestion, selected: selectedAnswer, correct: data.correct }])
    setAnswerRevealed(true)
  }

  const nextQuestion = () => {
    if (testIndex + 1 >= testQuestions.length) {
      setTestComplete(true)
    } else {
      setTestIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setCorrectAnswer(null)
      setAnswerRevealed(false)
    }
  }

  const endTest = () => {
    setTestStarted(false)
    setTestComplete(false)
  }

  const restartTest = () => {
    startTest()
  }

  const getCategoryResults = (): CategoryResult[] => {
    const results: Record<string, { correct: number; total: number }> = {}
    testAnswers.forEach(answer => {
      const cat = answer.question.category
      if (!results[cat]) results[cat] = { correct: 0, total: 0 }
      results[cat].total++
      if (answer.correct) results[cat].correct++
    })
    return Object.entries(results)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (a.correct / a.total) - (b.correct / b.total))
  }

  const goBackToSelect = () => {
    setAppMode('select')
    setSessionStarted(false)
    setTestStarted(false)
  }

  // App mode selection screen
  if (appMode === 'select') {
    return (
      <div className="container">
        <h1>Study Mode</h1>
        <div className="mode-select">
          <button className="mode-card" onClick={() => setAppMode('flashcards')}>
            <div className="mode-title">Flash Cards</div>
            <div className="mode-desc">Study with Q&A flashcards</div>
          </button>
          <button className="mode-card" onClick={() => setAppMode('test')}>
            <div className="mode-title">Practice Tests</div>
            <div className="mode-desc">Multiple choice quizzes</div>
          </button>
        </div>
      </div>
    )
  }

  // Test complete screen
  if (testComplete) {
    const categoryResults = getCategoryResults()
    const totalCorrect = testAnswers.filter(a => a.correct).length
    const totalQuestions = testAnswers.length
    const percentage = Math.round((totalCorrect / totalQuestions) * 100)

    return (
      <div className="container">
        <h1>Practice Test</h1>
        <div className="complete">
          <h2>Test Complete!</h2>
          <div className="test-score">
            <span className="score-number">{percentage}%</span>
            <span className="score-detail">{totalCorrect} of {totalQuestions} correct</span>
          </div>
          <div className="category-results">
            <h3>Results by Category</h3>
            {categoryResults.map(cat => {
              const pct = Math.round((cat.correct / cat.total) * 100)
              const strength = pct >= 80 ? 'strong' : pct >= 60 ? 'medium' : 'weak'
              return (
                <div key={cat.name} className={`category-row ${strength}`}>
                  <span className="category-name">{cat.name}</span>
                  <span className="category-score">{cat.correct}/{cat.total} ({pct}%)</span>
                </div>
              )
            })}
          </div>
          <div className="complete-buttons">
            <button onClick={restartTest}>Take Again</button>
            <button onClick={endTest} className="secondary">Change Settings</button>
            <button onClick={goBackToSelect} className="secondary">Back to Menu</button>
          </div>
        </div>
      </div>
    )
  }

  // Active test - show questions
  if (testStarted) {
    const currentQuestion = testQuestions[testIndex]
    const lastAnswer = testAnswers[testAnswers.length - 1]
    const wasCorrect = answerRevealed && lastAnswer?.correct

    return (
      <div className="container">
        <h1>Practice Test</h1>
        <div className="test-card">
          <div className="card-label">Question {testIndex + 1} of {testQuestions.length}</div>
          <div className="test-question">{currentQuestion.question}</div>
          <div className="test-options">
            {currentQuestion.options.map(opt => {
              let optionClass = 'test-option'
              if (answerRevealed) {
                if (opt.key === correctAnswer) {
                  optionClass += ' correct'
                } else if (opt.key === selectedAnswer) {
                  optionClass += ' incorrect'
                }
              } else if (selectedAnswer === opt.key) {
                optionClass += ' selected'
              }
              return (
                <button
                  key={opt.key}
                  className={optionClass}
                  onClick={() => !answerRevealed && setSelectedAnswer(opt.key)}
                  disabled={answerRevealed}
                >
                  <span className="option-key">{opt.key}</span>
                  <span className="option-text">{opt.text}</span>
                </button>
              )
            })}
          </div>
          {answerRevealed && (
            <div className={`answer-feedback ${wasCorrect ? 'correct' : 'incorrect'}`}>
              {wasCorrect ? 'Correct!' : `Incorrect. The correct answer is ${correctAnswer}.`}
            </div>
          )}
        </div>
        <button
          className="start-button"
          onClick={answerRevealed ? nextQuestion : submitAnswer}
          disabled={!selectedAnswer}
          style={{ opacity: selectedAnswer ? 1 : 0.5 }}
        >
          {answerRevealed
            ? (testIndex + 1 >= testQuestions.length ? 'See Results' : 'Next Question')
            : 'Submit Answer'}
        </button>
        <div className="stats">
          <button
            onClick={endTest}
            style={{
              background: 'transparent',
              border: '1px solid #4a4a6a',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            End Test
          </button>
        </div>
      </div>
    )
  }

  // Test setup screen
  if (appMode === 'test') {
    return (
      <div className="container">
        <h1>Practice Test</h1>
        <div className="category-select">
          <div className="category-header">
            <span>Select Categories</span>
            <div className="category-actions">
              <button onClick={selectAllCategories}>All</button>
              <button onClick={clearAllCategories}>None</button>
            </div>
          </div>
          <div className="category-list">
            {categories.map(cat => (
              <label key={cat.name} className="category-item">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat.name)}
                  onChange={() => toggleCategory(cat.name)}
                />
                <span>{cat.name} ({cat.count})</span>
              </label>
            ))}
          </div>
        </div>

        {maxTestQuestions === 0 ? (
          <div className="empty">
            <p>Select at least one category to begin.</p>
          </div>
        ) : (
          <>
            <div className="slider-container">
              <label>Number of questions: {testQuestionCount}</label>
              <input
                type="range"
                min="1"
                max={maxTestQuestions}
                value={testQuestionCount}
                onChange={(e) => setTestQuestionCount(Number(e.target.value))}
              />
              <div className="slider-labels">
                <span>1</span>
                <span>{maxTestQuestions}</span>
              </div>
            </div>

            <button className="start-button" onClick={startTest} disabled={testLoading}>
              {testLoading ? 'Loading...' : 'Start Test'}
            </button>
          </>
        )}

        <div className="stats">
          <button
            onClick={goBackToSelect}
            style={{
              background: 'transparent',
              border: '1px solid #4a4a6a',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  // Session complete screen
  if (sessionComplete) {
    return (
      <div className="container">
        <h1>Flashcards</h1>
        <div className="complete">
          <h2>Session Complete!</h2>
          <div className="stats">
            <span>Correct: {sessionStats.right}</span>
            <span>Wrong: {sessionStats.wrong}</span>
          </div>
          <div className="complete-buttons">
            <button onClick={restartSession}>Start Again</button>
            <button onClick={endSession} className="secondary">Change Settings</button>
            <button onClick={goBackToSelect} className="secondary">Back to Menu</button>
          </div>
        </div>
      </div>
    )
  }

  // Active session - show flashcards
  if (sessionStarted) {
    return (
      <div className="container">
        <h1>Flashcards</h1>

        <div className="card" onClick={() => setShowAnswer(!showAnswer)}>
          <div className="card-label">{showAnswer ? 'Answer' : 'Question'}</div>
          <div className="card-content">
            {showAnswer ? currentCard.answer : currentCard.question}
          </div>
          {!showAnswer && <div className="card-hint">Click to reveal answer</div>}
        </div>

        {showAnswer && (
          <div className="buttons">
            <button className="btn-wrong" onClick={() => handleAnswer(false)}>
              Wrong
            </button>
            <button className="btn-right" onClick={() => handleAnswer(true)}>
              Right
            </button>
          </div>
        )}

        <div className="progress">
          Card {currentIndex + 1} of {shuffledCards.length}
        </div>

        <div className="stats">
          <button
            onClick={endSession}
            style={{
              background: 'transparent',
              border: '1px solid #4a4a6a',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            End Session
          </button>
        </div>
      </div>
    )
  }

  // Setup screen - select deck, mode, card count
  return (
    <div className="container">
      <h1>Flashcards</h1>

      <div className="deck-select">
        <button className={deck === 'core' ? 'active' : ''} onClick={() => switchDeck('core')}>
          Core ({coreCards.length})
        </button>
        <button className={deck === 'acronyms' ? 'active' : ''} onClick={() => switchDeck('acronyms')}>
          Acronyms ({acronymCards.length})
        </button>
        <button className={deck === 'both' ? 'active' : ''} onClick={() => switchDeck('both')}>
          Both ({coreCards.length + acronymCards.length})
        </button>
      </div>

      <div className="mode-toggle">
        <button className={mode === 'all' ? 'active' : ''} onClick={() => switchMode('all')}>
          All Cards ({deckCards.length})
        </button>
        <button className={mode === 'wrong' ? 'active' : ''} onClick={() => switchMode('wrong')}>
          Wrong Only ({deckWrongCount})
        </button>
      </div>

      {maxCards === 0 ? (
        <div className="empty">
          <p>No cards to review!</p>
          <p>You've mastered all the cards in this deck.</p>
        </div>
      ) : (
        <>
          <div className="slider-container">
            <label>Number of cards: {cardCount}</label>
            <input
              type="range"
              min="1"
              max={maxCards}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
            />
            <div className="slider-labels">
              <span>1</span>
              <span>{maxCards}</span>
            </div>
          </div>

          <button className="start-button" onClick={startSession}>
            Start
          </button>
        </>
      )}

      <div className="stats">
        {deckWrongCount > 0 && (
          <button
            onClick={clearWrongAnswers}
            style={{
              background: 'transparent',
              border: '1px solid #4a4a6a',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Clear Wrong List
          </button>
        )}
        <button
          onClick={goBackToSelect}
          style={{
            background: 'transparent',
            border: '1px solid #4a4a6a',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            color: '#888',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          Back to Menu
        </button>
      </div>
    </div>
  )
}

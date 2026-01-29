'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

  // Refs for focus management
  const mainRef = useRef<HTMLElement>(null)
  const announcerRef = useRef<HTMLDivElement>(null)

  // Screen reader announcement helper
  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message
    }
  }, [])

  // Focus main content on screen changes
  useEffect(() => {
    mainRef.current?.focus()
  }, [appMode, sessionStarted, sessionComplete, testStarted, testComplete])

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
    announce(`Flashcard session started. ${cards.length} cards to review.`)
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
      announce('Session complete!')
    } else {
      setCurrentIndex(prev => prev + 1)
      setShowAnswer(false)
      announce(`Card ${currentIndex + 2} of ${shuffledCards.length}`)
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
    announce(`Switched to ${newDeck} deck`)
  }

  const switchMode = (newMode: 'all' | 'wrong') => {
    setMode(newMode)
    announce(`Switched to ${newMode === 'all' ? 'all cards' : 'wrong only'} mode`)
  }

  const clearWrongAnswers = () => {
    const deckCardIds = deckCards.map(c => c.id)
    setWrongIds(prev => prev.filter(id => !deckCardIds.includes(id)))
    announce('Wrong answers cleared')
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

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(c => c.name))
    announce('All categories selected')
  }

  const clearAllCategories = () => {
    setSelectedCategories([])
    announce('All categories cleared')
  }

  const startTest = async () => {
    setTestLoading(true)
    announce('Loading test questions...')
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
      announce(`Test started. ${data.questions.length} questions.`)
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
    announce(data.correct ? 'Correct!' : `Incorrect. The correct answer is ${data.correctAnswer}.`)
  }

  const nextQuestion = () => {
    if (testIndex + 1 >= testQuestions.length) {
      setTestComplete(true)
      announce('Test complete!')
    } else {
      setTestIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setCorrectAnswer(null)
      setAnswerRevealed(false)
      announce(`Question ${testIndex + 2} of ${testQuestions.length}`)
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

  // Handle keyboard for flashcard flip
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setShowAnswer(!showAnswer)
    }
  }

  // Skip link for keyboard users
  const SkipLink = () => (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  )

  // Screen reader announcer (visually hidden)
  const Announcer = () => (
    <div
      ref={announcerRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  )

  // App mode selection screen
  if (appMode === 'select') {
    return (
      <>
        <SkipLink />
        <Announcer />
        <main ref={mainRef} id="main-content" className="container" tabIndex={-1}>
          <h1>Study Mode</h1>
          <nav aria-label="Study mode selection">
            <div className="mode-select" role="group" aria-label="Choose study mode">
              <button
                className="mode-card"
                onClick={() => setAppMode('flashcards')}
                aria-describedby="flashcard-desc"
              >
                <span className="mode-title">Flash Cards</span><br />
                <span id="flashcard-desc" className="mode-desc">Study with Q&A flashcards</span>
              </button>
              <button
                className="mode-card"
                onClick={() => setAppMode('test')}
                aria-describedby="test-desc"
              >
                <span className="mode-title">Practice Tests</span><br />
                <span id="test-desc" className="mode-desc">Multiple choice quizzes</span>
              </button>
            </div>
          </nav>
        </main>
      </>
    )
  }

  // Test complete screen
  if (testComplete) {
    const categoryResults = getCategoryResults()
    const totalCorrect = testAnswers.filter(a => a.correct).length
    const totalQuestions = testAnswers.length
    const percentage = Math.round((totalCorrect / totalQuestions) * 100)

    return (
      <>
        <SkipLink />
        <Announcer />
        <main ref={mainRef} id="main-content" className="container" tabIndex={-1}>
          <h1>Practice Test</h1>
          <section className="complete" aria-labelledby="results-heading">
            <h2 id="results-heading">Test Complete!</h2>
            <div className="test-score" role="status" aria-label={`Your score: ${percentage} percent, ${totalCorrect} of ${totalQuestions} correct`}>
              <span className="score-number" aria-hidden="true">{percentage}%</span>
              <span className="score-detail">{totalCorrect} of {totalQuestions} correct</span>
            </div>
            <div className="category-results" aria-labelledby="category-heading">
              <h3 id="category-heading">Results by Category</h3>
              <ul role="list" className="category-list-results">
                {categoryResults.map(cat => {
                  const pct = Math.round((cat.correct / cat.total) * 100)
                  const strength = pct >= 80 ? 'strong' : pct >= 60 ? 'medium' : 'weak'
                  const strengthLabel = pct >= 80 ? 'Strong' : pct >= 60 ? 'Medium' : 'Needs improvement'
                  return (
                    <li key={cat.name} className={`category-row ${strength}`} aria-label={`${cat.name}: ${cat.correct} of ${cat.total} correct, ${pct} percent. ${strengthLabel}`}>
                      <span className="category-name">{cat.name}</span>
                      <span className="category-score">{cat.correct}/{cat.total} ({pct}%)</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="complete-buttons" role="group" aria-label="Test options">
              <button onClick={restartTest}>Take Again</button>
              <button onClick={endTest} className="secondary">Change Settings</button>
              <button onClick={goBackToSelect} className="secondary">Back to Menu</button>
            </div>
          </section>
        </main>
      </>
    )
  }

  // Active test - show questions
  if (testStarted) {
    const currentQuestion = testQuestions[testIndex]
    const lastAnswer = testAnswers[testAnswers.length - 1]
    const wasCorrect = answerRevealed && lastAnswer?.correct

    return (
      <>
        <SkipLink />
        <Announcer />
        <main ref={mainRef} id="main-content" className="container" tabIndex={-1}>
          <h1>Practice Test</h1>
          <section className="test-card" aria-labelledby="question-label">
            <div id="question-label" className="card-label">
              Question {testIndex + 1} of {testQuestions.length}
            </div>
            <p className="test-question" id="current-question">{currentQuestion.question}</p>
            <fieldset className="test-options" aria-describedby="current-question">
              <legend className="sr-only">Select your answer</legend>
              {currentQuestion.options.map(opt => {
                let optionClass = 'test-option'
                let ariaLabel = `Option ${opt.key}: ${opt.text}`
                if (answerRevealed) {
                  if (opt.key === correctAnswer) {
                    optionClass += ' correct'
                    ariaLabel += ' (Correct answer)'
                  } else if (opt.key === selectedAnswer) {
                    optionClass += ' incorrect'
                    ariaLabel += ' (Your answer - Incorrect)'
                  }
                } else if (selectedAnswer === opt.key) {
                  optionClass += ' selected'
                  ariaLabel += ' (Selected)'
                }
                return (
                  <button
                    key={opt.key}
                    className={optionClass}
                    onClick={() => !answerRevealed && setSelectedAnswer(opt.key)}
                    disabled={answerRevealed}
                    aria-label={ariaLabel}
                    aria-pressed={selectedAnswer === opt.key}
                  >
                    <span className="option-key" aria-hidden="true">{opt.key}</span>
                    <span className="option-text">{opt.text}</span>
                  </button>
                )
              })}
            </fieldset>
            {answerRevealed && (
              <div
                className={`answer-feedback ${wasCorrect ? 'correct' : 'incorrect'}`}
                role="alert"
                aria-live="assertive"
              >
                {wasCorrect ? 'Correct!' : `Incorrect. The correct answer is ${correctAnswer}.`}
              </div>
            )}
          </section>
          <button
            className="start-button"
            onClick={answerRevealed ? nextQuestion : submitAnswer}
            disabled={!selectedAnswer}
            aria-disabled={!selectedAnswer}
            style={{ opacity: selectedAnswer ? 1 : 0.5 }}
          >
            {answerRevealed
              ? (testIndex + 1 >= testQuestions.length ? 'See Results' : 'Next Question')
              : 'Submit Answer'}
          </button>
          <nav className="stats" aria-label="Test navigation">
            <button
              onClick={endTest}
              className="link-button"
              aria-label="End test and return to settings"
            >
              End Test
            </button>
          </nav>
        </main>
      </>
    )
  }

  // Test setup screen
  if (appMode === 'test') {
    return (
      <>
        <SkipLink />
        <Announcer />
        <main ref={mainRef} id="main-content" className="container" tabIndex={-1}>
          <h1>Practice Test</h1>
          <section className="category-select" aria-labelledby="category-select-heading">
            <div className="category-header">
              <span id="category-select-heading">Select Categories</span>
              <div className="category-actions" role="group" aria-label="Category selection actions">
                <button onClick={selectAllCategories} aria-label="Select all categories">All</button>
                <button onClick={clearAllCategories} aria-label="Clear all categories">None</button>
              </div>
            </div>
            <fieldset className="category-list">
              <legend className="sr-only">Available categories</legend>
              {categories.map(cat => (
                <label key={cat.name} className="category-item">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.name)}
                    onChange={() => toggleCategory(cat.name)}
                    aria-label={`${cat.name}, ${cat.count} questions`}
                  />
                  <span>{cat.name} ({cat.count})</span>
                </label>
              ))}
            </fieldset>
          </section>

          {maxTestQuestions === 0 ? (
            <div className="empty" role="alert">
              <p>Select at least one category to begin.</p>
            </div>
          ) : (
            <>
              <div className="slider-container">
                <label htmlFor="question-count-slider">
                  Select Number of questions: <strong>{testQuestionCount}</strong>
                </label>
                <input
                  id="question-count-slider"
                  type="range"
                  min={1}
                  max={maxTestQuestions}
                  value={testQuestionCount}
                  onChange={(e) => setTestQuestionCount(Number(e.target.value))}
                  aria-valuemin={1}
                  aria-valuemax={maxTestQuestions}
                  aria-valuenow={testQuestionCount}
                  aria-valuetext={`${testQuestionCount} questions`}
                />
                <div className="slider-labels" aria-hidden="true">
                  <span>1</span>
                  <span>{maxTestQuestions}</span>
                </div>
              </div>

              <button
                className="start-button"
                onClick={startTest}
                disabled={testLoading}
                aria-busy={testLoading}
              >
                {testLoading ? 'Loading...' : 'Start Test'}
              </button>
            </>
          )}

          <nav className="stats" aria-label="Navigation">
            <button
              onClick={goBackToSelect}
              className="link-button"
              aria-label="Return to study mode selection"
            >
              Back to Menu
            </button>
          </nav>
        </main>
      </>
    )
  }

  // Session complete screen
  if (sessionComplete) {
    return (
      <>
        <SkipLink />
        <Announcer />
        <main ref={mainRef} id="main-content" className="container" tabIndex={-1}>
          <h1>Flashcards</h1>
          <section className="complete" aria-labelledby="session-complete-heading">
            <h2 id="session-complete-heading">Session Complete!</h2>
            <div className="stats" role="status" aria-label={`Results: ${sessionStats.right} correct, ${sessionStats.wrong} wrong`}>
              <span>Correct: {sessionStats.right}</span>
              <span>Wrong: {sessionStats.wrong}</span>
            </div>
            <div className="complete-buttons" role="group" aria-label="Session options">
              <button onClick={restartSession}>Start Again</button>
              <button onClick={endSession} className="secondary">Change Settings</button>
              <button onClick={goBackToSelect} className="secondary">Back to Menu</button>
            </div>
          </section>
        </main>
      </>
    )
  }

  // Active session - show flashcards
  if (sessionStarted) {
    return (
      <>
        <SkipLink />
        <Announcer />
        <main ref={mainRef} id="main-content" className="container" tabIndex={-1}>
          <h1>Flashcards</h1>

          <div
            className="card"
            onClick={() => setShowAnswer(!showAnswer)}
            onKeyDown={handleCardKeyDown}
            tabIndex={0}
            role="button"
            aria-pressed={showAnswer}
            aria-label={showAnswer ? `Answer: ${currentCard.answer}. Press Enter or Space to hide answer.` : `Question: ${currentCard.question}. Press Enter or Space to reveal answer.`}
          >
            <div className="card-label" aria-hidden="true">{showAnswer ? 'Answer' : 'Question'}</div>
            <div className="card-content">
              {showAnswer ? currentCard.answer : currentCard.question}
            </div>
            {!showAnswer && <div className="card-hint" aria-hidden="true">Click or press Enter to reveal answer</div>}
          </div>

          {showAnswer && (
            <div className="buttons" role="group" aria-label="Rate your answer">
              <button
                className="btn-wrong"
                onClick={() => handleAnswer(false)}
                aria-label="Mark as wrong"
              >
                Wrong
              </button>
              <button
                className="btn-right"
                onClick={() => handleAnswer(true)}
                aria-label="Mark as correct"
              >
                Right
              </button>
            </div>
          )}

          <div className="progress" role="status" aria-live="polite">
            Card {currentIndex + 1} of {shuffledCards.length}
          </div>

          <nav className="stats" aria-label="Session navigation">
            <button
              onClick={endSession}
              className="link-button"
              aria-label="End session and return to settings"
            >
              End Session
            </button>
          </nav>
        </main>
      </>
    )
  }

  // Setup screen - select deck, mode, card count
  return (
    <>
      <SkipLink />
      <Announcer />
      <main ref={mainRef} id="main-content" className="container" tabIndex={-1}>
        <h1>Flashcards</h1>

        <fieldset className="deck-select" role="group" aria-label="Select deck">
          <legend className="sr-only">Choose a deck</legend>
          <button
            className={deck === 'core' ? 'active' : ''}
            onClick={() => switchDeck('core')}
            aria-pressed={deck === 'core'}
          >
            Core ({coreCards.length})
          </button>
          <button
            className={deck === 'acronyms' ? 'active' : ''}
            onClick={() => switchDeck('acronyms')}
            aria-pressed={deck === 'acronyms'}
          >
            Acronyms ({acronymCards.length})
          </button>
          <button
            className={deck === 'both' ? 'active' : ''}
            onClick={() => switchDeck('both')}
            aria-pressed={deck === 'both'}
          >
            Both ({coreCards.length + acronymCards.length})
          </button>
        </fieldset>

        <fieldset className="mode-toggle" role="group" aria-label="Select card filter">
          <legend className="sr-only">Filter cards</legend>
          <button
            className={mode === 'all' ? 'active' : ''}
            onClick={() => switchMode('all')}
            aria-pressed={mode === 'all'}
          >
            All Cards ({deckCards.length})
          </button>
          <button
            className={mode === 'wrong' ? 'active' : ''}
            onClick={() => switchMode('wrong')}
            aria-pressed={mode === 'wrong'}
          >
            Wrong Only ({deckWrongCount})
          </button>
        </fieldset>

        {maxCards === 0 ? (
          <div className="empty" role="status">
            <p>No cards to review!</p>
            <p>You've mastered all the cards in this deck.</p>
          </div>
        ) : (
          <>
            <div className="slider-container">
              <label htmlFor="card-count-slider">
                Number of cards: <strong>{cardCount}</strong>
              </label>
              <input
                id="card-count-slider"
                type="range"
                min={1}
                max={maxCards}
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                aria-valuemin={1}
                aria-valuemax={maxCards}
                aria-valuenow={cardCount}
                aria-valuetext={`${cardCount} cards`}
              />
              <div className="slider-labels" aria-hidden="true">
                <span>1</span>
                <span>{maxCards}</span>
              </div>
            </div>

            <button className="start-button" onClick={startSession}>
              Start
            </button>
          </>
        )}

        <nav className="stats" aria-label="Additional options">
          {deckWrongCount > 0 && (
            <button
              onClick={clearWrongAnswers}
              className="link-button"
              aria-label={`Clear ${deckWrongCount} wrong answers from this deck`}
            >
              Clear Wrong List
            </button>
          )}
          <button
            onClick={goBackToSelect}
            className="link-button"
            aria-label="Return to study mode selection"
          >
            Back to Menu
          </button>
        </nav>
      </main>
    </>
  )
}

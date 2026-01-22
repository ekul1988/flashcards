'use client'

import { useState, useEffect } from 'react'
import flashcardsData from '../data/flashcards.json'

type Flashcard = {
  id: number
  question: string
  answer: string
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
  const [mode, setMode] = useState<'all' | 'wrong'>('all')
  const [wrongIds, setWrongIds] = useState<number[]>([])
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState({ right: 0, wrong: 0 })

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

  // Shuffle cards when mode changes or on initial load
  useEffect(() => {
    const cards: Flashcard[] = mode === 'all'
      ? flashcardsData
      : flashcardsData.filter(card => wrongIds.includes(card.id))
    setShuffledCards(shuffle(cards))
    setCurrentIndex(0)
    setShowAnswer(false)
    setSessionComplete(false)
    setSessionStats({ right: 0, wrong: 0 })
  }, [mode, wrongIds.length])

  const currentCard = shuffledCards[currentIndex]

  const handleAnswer = (correct: boolean) => {
    if (!currentCard) return

    if (correct) {
      // Remove from wrong list if it was there
      setWrongIds(prev => prev.filter(id => id !== currentCard.id))
      setSessionStats(prev => ({ ...prev, right: prev.right + 1 }))
    } else {
      // Add to wrong list if not already there
      setWrongIds(prev => prev.includes(currentCard.id) ? prev : [...prev, currentCard.id])
      setSessionStats(prev => ({ ...prev, wrong: prev.wrong + 1 }))
    }

    // Move to next card or complete session
    if (currentIndex + 1 >= shuffledCards.length) {
      setSessionComplete(true)
    } else {
      setCurrentIndex(prev => prev + 1)
      setShowAnswer(false)
    }
  }

  const resetSession = () => {
    const cards: Flashcard[] = mode === 'all'
      ? flashcardsData
      : flashcardsData.filter(card => wrongIds.includes(card.id))
    setShuffledCards(shuffle(cards))
    setCurrentIndex(0)
    setShowAnswer(false)
    setSessionComplete(false)
    setSessionStats({ right: 0, wrong: 0 })
  }

  const switchMode = (newMode: 'all' | 'wrong') => {
    setMode(newMode)
    resetSession()
  }

  const clearWrongAnswers = () => {
    setWrongIds([])
    if (mode === 'wrong') {
      resetSession()
    }
  }

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
          <button onClick={resetSession}>Start Again</button>
        </div>
      </div>
    )
  }

  if (shuffledCards.length === 0) {
    return (
      <div className="container">
        <h1>Flashcards</h1>
        <div className="mode-toggle">
          <button className={mode === 'all' ? 'active' : ''} onClick={() => switchMode('all')}>
            All Cards ({flashcardsData.length})
          </button>
          <button className={mode === 'wrong' ? 'active' : ''} onClick={() => switchMode('wrong')}>
            Wrong Only ({wrongIds.length})
          </button>
        </div>
        <div className="empty">
          <p>No cards to review!</p>
          <p>You've mastered all the cards.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Flashcards</h1>

      <div className="mode-toggle">
        <button className={mode === 'all' ? 'active' : ''} onClick={() => switchMode('all')}>
          All Cards ({flashcardsData.length})
        </button>
        <button className={mode === 'wrong' ? 'active' : ''} onClick={() => switchMode('wrong')}>
          Wrong Only ({wrongIds.length})
        </button>
      </div>

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

      {wrongIds.length > 0 && (
        <div className="stats">
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
        </div>
      )}
    </div>
  )
}

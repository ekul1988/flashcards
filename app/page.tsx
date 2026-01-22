'use client'

import { useState, useEffect } from 'react'
import coreData from '../data/flashcards_core.json'
import acronymsData from '../data/flashcards_acronyms.json'

type Flashcard = {
  id: string
  question: string
  answer: string
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

      {deckWrongCount > 0 && (
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

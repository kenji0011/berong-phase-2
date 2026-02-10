"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Trophy, Star, RotateCcw } from "lucide-react"
import Link from "next/link"

interface MemoryCard {
  id: number
  name: string
  emoji: string
  matched: boolean
  flipped: boolean
}

const cardPairs = [
  { name: "Fire Extinguisher", emoji: "🧯" },
  { name: "Fire Truck", emoji: "🚒" },
  { name: "Firefighter", emoji: "👨‍🚒" },
  { name: "Fire Alarm", emoji: "🔔" },
  { name: "Water Hose", emoji: "💧" },
  { name: "Fire Hydrant", emoji: "🚰" },
]

export default function MemoryGamePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    if (!user?.permissions.accessKids && user?.role !== 'admin') {
      router.push("/")
      return
    }

    initializeGame()
    setLoading(false)
  }, [isAuthenticated, user, router, isLoading])

  const initializeGame = () => {
    const duplicatedCards = [...cardPairs, ...cardPairs]
      .map((card, index) => ({
        id: index,
        name: card.name,
        emoji: card.emoji,
        matched: false,
        flipped: false,
      }))
      .sort(() => Math.random() - 0.5)

    setCards(duplicatedCards)
    setFlippedCards([])
    setMoves(0)
    setMatches(0)
    setGameComplete(false)
  }

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2) return
    if (flippedCards.includes(cardId)) return

    // Find the card by id, not by index
    const clickedCard = cards.find(c => c.id === cardId)
    if (!clickedCard || clickedCard.matched) return

    const newFlippedCards = [...flippedCards, cardId]
    setFlippedCards(newFlippedCards)

    const newCards = cards.map((card) => (card.id === cardId ? { ...card, flipped: true } : card))
    setCards(newCards)

    if (newFlippedCards.length === 2) {
      setMoves(moves + 1)
      const [firstId, secondId] = newFlippedCards

      // Find cards by id, not by index
      const firstCard = cards.find(c => c.id === firstId)
      const secondCard = cards.find(c => c.id === secondId)

      if (firstCard && secondCard && firstCard.name === secondCard.name) {
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((card) => (card.id === firstId || card.id === secondId ? { ...card, matched: true } : card)),
          )
          setMatches(matches + 1)
          setFlippedCards([])

          if (matches + 1 === cardPairs.length) {
            setGameComplete(true)
          }
        }, 500)
      } else {
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((card) => (card.id === firstId || card.id === secondId ? { ...card, flipped: false } : card)),
          )
          setFlippedCards([])
        }, 1000)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/kids">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Activities
          </Button>
        </Link>

        <Card className="border-4 border-bfp-blue mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-bfp-blue">Memory Match Game</CardTitle>
              <Button onClick={initializeGame} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                New Game
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Moves</p>
                <p className="text-2xl font-bold text-gray-900">{moves}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Matches</p>
                <p className="text-2xl font-bold text-bfp-blue">
                  {matches} / {cardPairs.length}
                </p>
              </div>
            </div>

            {gameComplete && (
              <Alert className="mb-6 border-green-500 bg-green-50">
                <Trophy className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Congratulations!</strong> You completed the game in {moves} moves!
                  <div className="flex gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${moves <= 15
                          ? "text-yellow-400 fill-yellow-400"
                          : i < 3
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                          }`}
                      />
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={card.matched || card.flipped}
                  className={`aspect-square rounded-lg text-4xl flex items-center justify-center transition-all transform hover:scale-105 ${card.flipped || card.matched
                    ? "bg-white border-2 border-bfp-blue"
                    : "bg-gradient-to-br from-bfp-blue to-purple-500 hover:from-bfp-blue/90 hover:to-purple-500/90"
                    } ${card.matched ? "opacity-50" : ""}`}
                >
                  {card.flipped || card.matched ? card.emoji : "❓"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

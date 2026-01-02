import { useEffect, useState, useRef } from "react"

/* =========================
   TYPES
========================= */

type Operator = "+" | "-" | "*" | "/" | "%"

type NumberChallenge = {
  type: "number"
  value: number
}

type ExpressionChallenge = {
  type: "expression"
  terms: number[]
  operators: Operator[]
}

type Challenge = NumberChallenge | ExpressionChallenge

type GameStatus = "playing" | "ended"


/* =========================
   HELPERS
========================= */
function playSound(audio: HTMLAudioElement | null) {
  if (!audio) return
  audio.currentTime = 0
  audio.play().catch(() => {})
}

function randomInt0to9(): number {
  return Math.floor(Math.random() * 10)
}

function safeDivide(a: number, b: number): number {
  if (b === 0) return 0
  return Math.floor(a / b)
}

function getUnlockedOperators(combo: number): Operator[] {
  if (combo >= 30) return ["+", "-", "*", "/", "%"]
  if (combo >= 20) return ["+", "-", "*"]
  if (combo >= 10) return ["+", "-"]
  return []
}
function getScoreGain(combo: number): number {
  if (combo >= 40) return 5
  if (combo >= 30) return 4
  if (combo >= 20) return 3
  if (combo >= 10) return 2
  return 1
}


function generateExpression(combo: number): ExpressionChallenge {
  const operators = getUnlockedOperators(combo)
  const termCount = combo >= 40 ? 3 : 2

  const terms = Array.from({ length: termCount }, randomInt0to9)
  const ops: Operator[] = []

  for (let i = 0; i < termCount - 1; i++) {
    ops.push(operators[Math.floor(Math.random() * operators.length)])
  }

  return {
    type: "expression",
    terms,
    operators: ops,
  }
}

function generateChallenge(combo: number): Challenge {
  if (combo < 10) {
    return { type: "number", value: randomInt0to9() }
  }

  return Math.random() < 0.5
    ? { type: "number", value: randomInt0to9() }
    : generateExpression(combo)
}

function evaluateExpression(expr: ExpressionChallenge): number {
  let result = expr.terms[0]

  expr.operators.forEach((op, i) => {
    const next = expr.terms[i + 1]

    switch (op) {
      case "+":
        result += next
        break
      case "-":
        result -= next
        break
      case "*":
        result *= next
        break
      case "/":
        result = safeDivide(result, next)
        break
      case "%":
        result = next === 0 ? 0 : result % next
        break
    }
  })

  return result
}

function isChallengeEven(challenge: Challenge): boolean {
  if (challenge.type === "number") {
    return challenge.value % 2 === 0
  }

  return evaluateExpression(challenge) % 2 === 0
}

function generateQueue(length: number, combo: number): Challenge[] {
  return Array.from({ length }, () => generateChallenge(combo))
}

/* =========================
   COMPONENT
========================= */

export default function EvenOddGame() {
  const [queue, setQueue] = useState<Challenge[]>(() =>
    generateQueue(5, 0)
  )

const correctSound = useRef<HTMLAudioElement | null>(null)
const wrongSound = useRef<HTMLAudioElement | null>(null)

  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [status, setStatus] = useState<GameStatus>("ended")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const current = queue[0]
  const preview = queue.slice(1).reverse()

  /* ===== TIMER ===== */

  useEffect(() => {
    if (status !== "playing") return

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          setStatus("ended")
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status])
//sounds
  useEffect(() => {
    correctSound.current = new Audio("/public/sounds/correct.mp3")
    wrongSound.current = new Audio("/public/sounds/incorrect.mp3")
  }, [])

  /* ===== QUEUE ADVANCE ===== */

  const advanceQueue = (newCombo: number) => {
    setQueue((q) => [...q.slice(1), generateChallenge(newCombo)])
  }

  /* ===== GUESS HANDLER ===== */

  const handleGuess = (guess: "even" | "odd") => {
    if (status !== "playing" || isLocked) return
  
    const correct =
      (guess === "even" && isChallengeEven(current)) ||
      (guess === "odd" && !isChallengeEven(current))
  
      if (correct) {
        playSound(correctSound.current)
        const nextCombo = combo + 1
        const scoreGain = getScoreGain(nextCombo)
        

      
        setScore((s) => s + scoreGain)
        setCombo(nextCombo)
        setFeedback(`+${scoreGain}`)
      
        advanceQueue(nextCombo)
        return
      }
      
  
    // ❌ WRONG
    playSound(wrongSound.current)

    setFeedback("Wrong!")
    setCombo(0)
    setIsLocked(true)
  
    setTimeout(() => {
      setIsLocked(false)
      setFeedback(null)
      advanceQueue(0)
    }, 2000)
  }
  

  /* ===== KEYBOARD CONTROLS ===== */

  useEffect(() => {
    if (status !== "playing") return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isLocked) return

      if (e.key === "f" || e.key === "F") handleGuess("even")
        if (e.key === "d" || e.key === "D") handleGuess("even")
      if (e.key === "j" || e.key === "J") handleGuess("odd")
        if (e.key === "k" || e.key === "K") handleGuess("odd")
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [status, isLocked, current])

  /* ===== RESET ===== */

  const resetGame = () => {
    setScore(0)
    setCombo(0)
    setTimeLeft(60)
    setStatus("playing")
    setFeedback(null)
    setIsLocked(false)
    setQueue(generateQueue(5, 0))
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div
      className={`flex flex-col items-center justify-center h-screen gap-4 text-white transition-colors
        ${isLocked ? "bg-red-900" : "bg-gray-900"}
      `}
    >
      <h1 className="text-2xl font-bold">Even or Odd?</h1>

      {/* PREVIEW QUEUE */}
      <div className="flex flex-col items-center gap-2 mb-2">
        {preview.map((c, i) => (
          <div
            key={i}
            className="w-30 h-10 flex items-center justify-center rounded bg-gray-800 text-2xl font-mono opacity-70"
          >
            {c.type === "number"
              ? c.value
              : c.terms.map((t, j) =>
                  c.operators[j] ? `${t}${c.operators[j]}` : t
                )}
          </div>
        ))}
      </div>

      {/* ACTIVE */}
      <div className="text-8xl font-mono">
        {current.type === "number"
          ? current.value
          : current.terms.map((t, i) => (
              <span key={i}>
                {t}
                {current.operators[i] && (
                  <span className="mx-2">{current.operators[i]}</span>
                )}
              </span>
            ))}
      </div>

      {/* CONTROLS */}
      <div className="flex gap-4">
        <button
          onClick={() => handleGuess("even")}
          disabled={isLocked || status !== "playing"}
          className="px-6 py-3 bg-blue-600 rounded disabled:opacity-40"
        >
          Even (F)(D)
        </button>
        <button
          onClick={() => handleGuess("odd")}
          disabled={isLocked || status !== "playing"}
          className="px-6 py-3 bg-pink-600 rounded disabled:opacity-40"
        >
          Odd (J)(K)
        </button>
      </div>

      {/* FEEDBACK */}
      <div className="h-6 text-lg">
        {isLocked ? "⛔ Locked!" : feedback}
      </div>

      {/* HUD */}
      <div className="flex gap-6 text-sm opacity-80">
        <span>Score: {score}</span>
        <span>Combo: {combo}</span>
        <span>Time: {timeLeft}s</span>
      </div>


      {status === "ended" && (
        <button
          onClick={resetGame}
          className="mt-4 px-4 py-2 bg-green-600 rounded"
        >
          Play Again
        </button>
      )}
    </div>
  )
}

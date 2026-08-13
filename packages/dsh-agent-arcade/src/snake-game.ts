export type Point = {
  x: number
  y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameStatus = 'running' | 'won' | 'lost'

export type SnakeStep = {
  step: number
  direction: Direction
  reason: string
  head: Point
  food: Point | null
  score: number
  status: GameStatus
}

export type SnakeSnapshot = {
  width: number
  height: number
  seed: number
  snake: Point[]
  food: Point | null
  direction: Direction
  score: number
  status: GameStatus
  step: number
}

export type SnakeGameOptions = {
  width?: number
  height?: number
  seed?: number
}

const DEFAULT_WIDTH = 12
const DEFAULT_HEIGHT = 8
const MAX_BOARD_CELLS = 900
const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left']

export class SnakeGame {
  public readonly width: number
  public readonly height: number
  public readonly seed: number
  private readonly random: SeededRandom
  private snake: Point[]
  private food: Point | null
  private direction: Direction
  private score = 0
  private status: GameStatus = 'running'
  private stepNumber = 0
  private readonly decisions: SnakeStep[] = []

  public constructor(options: SnakeGameOptions = {}) {
    this.width = normalizeDimension(options.width, DEFAULT_WIDTH, 'width')
    this.height = normalizeDimension(options.height, DEFAULT_HEIGHT, 'height')
    if (this.width * this.height > MAX_BOARD_CELLS) {
      throw new Error(`Board cannot exceed ${MAX_BOARD_CELLS} cells.`)
    }

    this.seed = normalizeSeed(options.seed)
    this.random = new SeededRandom(this.seed)
    const center = { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) }
    this.snake = [center, { x: center.x - 1, y: center.y }, { x: center.x - 2, y: center.y }]
    this.direction = 'right'
    this.food = this.placeFood()
  }

  public snapshot(): SnakeSnapshot {
    return {
      width: this.width,
      height: this.height,
      seed: this.seed,
      snake: this.snake.map(copyPoint),
      food: this.food === null ? null : copyPoint(this.food),
      direction: this.direction,
      score: this.score,
      status: this.status,
      step: this.stepNumber,
    }
  }

  public history(): SnakeStep[] {
    return this.decisions.map((decision) => ({
      ...decision,
      head: copyPoint(decision.head),
      food: decision.food === null ? null : copyPoint(decision.food),
    }))
  }

  public render(): string {
    const cells = new Map<string, string>()
    this.snake.forEach((segment, index) => cells.set(pointKey(segment), index === 0 ? 'H' : 'o'))
    if (this.food !== null) cells.set(pointKey(this.food), '*')

    const border = `+${'-'.repeat(this.width)}+`
    const rows = [border]
    for (let y = 0; y < this.height; y += 1) {
      let row = '|'
      for (let x = 0; x < this.width; x += 1) {
        row += cells.get(`${x},${y}`) ?? ' '
      }
      rows.push(`${row}|`)
    }
    rows.push(border)
    rows.push(`Score: ${this.score} | Step: ${this.stepNumber} | Status: ${this.status}`)
    return rows.join('\n')
  }

  public step(requestedDirection?: Direction): SnakeStep {
    if (this.status !== 'running') throw new Error(`Game is already ${this.status}.`)

    const decision = requestedDirection ?? this.chooseDirection()
    if (!DIRECTIONS.includes(decision)) throw new Error(`Unknown direction: ${decision}.`)
    if (isOpposite(decision, this.direction)) {
      throw new Error(`The snake cannot reverse from ${this.direction} to ${decision}.`)
    }

    this.direction = decision
    const nextHead = movePoint(this.snake[0] as Point, decision)
    const willEat = this.food !== null && samePoint(nextHead, this.food)
    const hitWall =
      nextHead.x < 0 || nextHead.x >= this.width || nextHead.y < 0 || nextHead.y >= this.height
    const hitBody = this.snake.some(
      (segment, index) =>
        samePoint(segment, nextHead) && (willEat || index < this.snake.length - 1),
    )

    this.stepNumber += 1
    if (hitWall || hitBody) {
      this.status = 'lost'
    } else {
      this.snake.unshift(nextHead)
      if (willEat) {
        this.score += 1
        this.food = this.placeFood()
        if (this.food === null) this.status = 'won'
      } else {
        this.snake.pop()
      }
    }

    const result: SnakeStep = {
      step: this.stepNumber,
      direction: decision,
      reason: this.explainDecision(decision, nextHead, hitWall || hitBody, willEat),
      head: copyPoint(this.snake[0] as Point),
      food: this.food === null ? null : copyPoint(this.food),
      score: this.score,
      status: this.status,
    }
    this.decisions.push(result)
    return {
      ...result,
      head: copyPoint(result.head),
      food: result.food === null ? null : copyPoint(result.food),
    }
  }

  private chooseDirection(): Direction {
    const candidates = DIRECTIONS.filter((direction) => !isOpposite(direction, this.direction))
    const food = this.food
    if (food === null) return candidates[0] ?? this.direction

    const currentHead = this.snake[0] as Point
    return [...candidates].sort((left, right) => {
      const leftDistance = distanceAfterMove(currentHead, left, food)
      const rightDistance = distanceAfterMove(currentHead, right, food)
      if (leftDistance !== rightDistance) return leftDistance - rightDistance
      return DIRECTIONS.indexOf(left) - DIRECTIONS.indexOf(right)
    })[0] as Direction
  }

  private explainDecision(
    decision: Direction,
    nextHead: Point,
    collision: boolean,
    willEat: boolean,
  ): string {
    if (collision)
      return `Move ${decision} from the current heading; collision detected at (${nextHead.x},${nextHead.y}).`
    if (willEat)
      return `Move ${decision} toward the food at (${nextHead.x},${nextHead.y}) and collect it.`
    if (this.food === null) return `Move ${decision}; the board is clear and no food remains.`
    return `Move ${decision} to reduce the distance to food at (${this.food.x},${this.food.y}).`
  }

  private placeFood(): Point | null {
    const free: Point[] = []
    const occupied = new Set(this.snake.map(pointKey))
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y })
      }
    }
    if (free.length === 0) return null
    return free[this.random.nextInt(free.length)] ?? null
  }
}

class SeededRandom {
  private state: number

  public constructor(seed: number) {
    this.state = seed || 1
  }

  public nextInt(maxExclusive: number): number {
    this.state = (this.state * 1_664_525 + 1_013_904_223) >>> 0
    return this.state % maxExclusive
  }
}

function normalizeDimension(value: number | undefined, fallback: number, name: string): number {
  const dimension = value ?? fallback
  if (!Number.isInteger(dimension) || dimension < 5 || dimension > 30) {
    throw new Error(`${name} must be an integer between 5 and 30.`)
  }
  return dimension
}

function normalizeSeed(value: number | undefined): number {
  const seed = value ?? 1
  if (!Number.isInteger(seed) || seed < 0 || seed > 4_294_967_295) {
    throw new Error('seed must be an unsigned 32-bit integer.')
  }
  return seed >>> 0
}

function movePoint(point: Point, direction: Direction): Point {
  if (direction === 'up') return { x: point.x, y: point.y - 1 }
  if (direction === 'down') return { x: point.x, y: point.y + 1 }
  if (direction === 'left') return { x: point.x - 1, y: point.y }
  return { x: point.x + 1, y: point.y }
}

function distanceAfterMove(point: Point, direction: Direction, target: Point): number {
  return manhattan(movePoint(point, direction), target)
}

function manhattan(left: Point, right: Point): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

function isOpposite(left: Direction, right: Direction): boolean {
  return (
    (left === 'up' && right === 'down') ||
    (left === 'down' && right === 'up') ||
    (left === 'left' && right === 'right') ||
    (left === 'right' && right === 'left')
  )
}

function samePoint(left: Point, right: Point): boolean {
  return left.x === right.x && left.y === right.y
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`
}

function copyPoint(point: Point): Point {
  return { x: point.x, y: point.y }
}

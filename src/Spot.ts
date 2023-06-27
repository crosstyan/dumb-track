/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import Konva from 'konva'
import { Option, None, Some, none, some,isNone,isSome,getOrElse } from "fp-ts/Option"
import * as O from "fp-ts/Option"
import { pipe } from 'fp-ts/function'
import {range, concat, cloneDeep} from "lodash"
import { DateTime, Duration } from "luxon"

export interface SpotConfig {
  /// the length of a circle in meter
  circleLength: number
  /// line length in meter
  lineLength: number
  /// the number of spot in a circle
  total: number
  /// current spot position (0<=current<total)
  current: number
  /// update interval
  updateInterval: Duration
}

export type SpeedMap = Record<number, number>

export class Track {
  color: string
  speeds: SpeedMap
  tag: string
  constructor(map: SpeedMap, color: string = "red", tag: string = "") {
    this.color = color
    this.speeds = map
    this.tag = tag
  }
}

export enum SpotState {
  STOP,
  START,
}


/// intermedia state needed for calculation
export interface CalcState {
  startTime: DateTime
  lastIntegralTime: DateTime
  /// in seconds relative to startTime
  lastIntegralRelativeTime: number
  /// in meter and we use this to find current speed by looking up the speed map
  lastIntegralDistance: number
}

const getNearestSpeed = (speeds: SpeedMap, distance: number): number => {
  const keys = Object.keys(speeds).map((s) => parseInt(s))
  const nearest = keys.reduce((prev, curr) => {
    if (Math.abs(curr - distance) < Math.abs(prev - distance)) {
      return curr
    }
    return prev
  })
  return speeds[nearest]
}

const nextState = (lastState: CalcState, now: DateTime, speeds: SpeedMap): Option<CalcState> => {
  const deltaT = now.diff(lastState.lastIntegralTime).as("seconds")
  if (deltaT < 0) {
    return none
  }
  const speed = getNearestSpeed(speeds, lastState.lastIntegralDistance)
  const deltaL = speed * deltaT
  const newState: CalcState = {
    startTime: lastState.startTime,
    lastIntegralTime: now,
    lastIntegralRelativeTime: lastState.lastIntegralRelativeTime + deltaT,
    lastIntegralDistance: lastState.lastIntegralDistance + deltaL,
  }
  return some(newState)
}

// only consider the most simple case
const calcEnabledId = (state:CalcState, spot: SpotConfig): number[] => {
  const headDist = state.lastIntegralDistance
  const head = headDist % spot.circleLength
  let extra:Option<number> = none
  let tail:number
  if (head < spot.lineLength) {
    const extraVal = spot.lineLength - head
    extra = some(extraVal)
    tail = spot.circleLength - extraVal
  } else {
    tail = head - spot.lineLength
  }
  const spotDistance = spot.circleLength / spot.total
  const headSpotId = Math.floor(head / spotDistance)
  const tailSpotId = Math.floor(tail / spotDistance)
  if (isSome(extra)) {
    const h = range(0, headSpotId)
    let t: number[]
    if (headDist < spot.circleLength){
      t = []
    } else {
      t = range(tailSpotId, spot.total)
    }
    return concat(h, t)
  } else {
    return range(tailSpotId, headSpotId)
  }
}

export class Spot {
  public id:number
  public timestamp: DateTime
  public state: SpotState = SpotState.STOP
  public circle: Konva.Circle
  private tracks: [Track, CalcState][] = []
  // for refreshing
  private cb: (spot: Spot) => void = (spot: Spot) => {}
  private config: SpotConfig
  private timerId: Option<number> = none

  /**
   * @param spot 
   * @param circle 
   */
  constructor(id:number,spot: SpotConfig, circle: Konva.CircleConfig) {
    this.config = spot
    this.circle = new Konva.Circle(circle)
    this.timestamp = DateTime.now()
    this.id = id
  }

  setTracks(tracks: Track[]) {
    if (this.state !== SpotState.STOP) {
      return
    }
    
    const t = DateTime.now()
    const calc: CalcState = {
      startTime: t,
      lastIntegralTime: t,
      lastIntegralDistance: 0,
      lastIntegralRelativeTime: 0,
    }
    this.tracks = tracks.map((t) => [t, cloneDeep(calc)])
  }

  getTracks() {
    return this.tracks
  }

  start() {
    this.state = SpotState.START
    const timerId = setInterval(()=>{this.update()}, this.config.updateInterval.as("milliseconds"))
    this.timerId = some(timerId)
  }

  stop() {
    if (isSome(this.timerId)) {
      clearInterval(this.timerId.value)
    }
  }

  setCallback(cb: (spot: Spot) => void) {
    this.cb = cb
  }

  update(){
    if (this.state !== SpotState.START) {
      return
    }
    let isChanged = false
    for (const track of this.tracks){
      const [t, calc] = track
      const now = DateTime.now()
      const newState = nextState(calc, now, t.speeds)
      if (isSome(newState)) {
        const enabledIds = calcEnabledId(newState.value, this.config)
        if (enabledIds.includes(this.id)) {
          isChanged = true
          this.circle.fill(t.color)
        } 
        track[1] = newState.value
      }
    }

    if (!isChanged) {
      this.circle.fill("black")
    }

    this.cb(this)
  }
}

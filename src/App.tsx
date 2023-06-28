/* eslint-disable @typescript-eslint/no-empty-function */
import Konva from 'konva'
import {Vector2d} from 'konva/lib/types'
import {Stage, Layer, Rect, Text, Circle, Path} from 'react-konva'
import { useRef, useEffect, useState } from 'react'
import {range,take} from 'lodash'
import { SpeedMap, Spot, SpotConfig, Track } from './Spot'
import { CircleConfig } from 'konva/lib/shapes/Circle'
import { Duration } from 'luxon'

// https://gist.github.com/danielpquinn/dd966af424030d47e476
/**
 * Get path data for a rounded rectangle. Allows for different radius on each corner.
 * @param  {Number} w   Width of rounded rectangle
 * @param  {Number} h   Height of rounded rectangle
 * @param  {Number} tlr Top left corner radius
 * @param  {Number} trr Top right corner radius
 * @param  {Number} brr Bottom right corner radius
 * @param  {Number} blr Bottom left corner radius
 * @return {String}     Rounded rectangle SVG path data
 */
const roundedRectData = (w:number, h:number, tlr:number, trr:number, brr:number, blr:number) => {
  return 'M 0 ' + tlr
    + ' A ' + tlr + ' ' + tlr + ' 0 0 1 ' + tlr + ' 0'
    + ' L ' + (w - trr) + ' 0'
    + ' A ' + trr + ' ' + trr + ' 0 0 1 ' + w + ' ' + trr
    + ' L ' + w + ' ' + (h - brr)
    + ' A ' + brr + ' ' + brr + ' 0 0 1 ' + (w - brr) + ' ' + h
    + ' L ' + blr + ' ' + h
    + ' A ' + blr + ' ' + blr + ' 0 0 1 0 ' + (h - blr)
    + ' Z';
}

const sameRadiusRoundedRectData = (w:number, h:number, r:number) => {
  return roundedRectData(w, h, r, r, r, r);
}

function App() {
  // https://svgjs.dev/docs/3.1/
  const Canvas = () => {
    const [startFn, setStartFn] = useState<() => void>(() => {})
    const rectRef = useRef<Konva.Path>(null)
    const layerRef = useRef<Konva.Layer>(null)
    const rectWidth = 640
    const rectHeight = 240
    const windowWidth = window.innerWidth
    const x = (windowWidth - rectWidth) / 2
    // https://stackoverflow.com/questions/4441451/library-to-generate-svg-path-with-javascript
    useEffect(() => {
      const rect =  rectRef.current
      const layer = layerRef.current
      const getAbsolutePointAtLength = (path:Konva.Path, length:number) => {
        const absP = path.absolutePosition()
        const tempP = path.getPointAtLength(length)
        const p:Vector2d = {x: tempP.x + absP.x, y: tempP.y + absP.y}
        return p
      }
      if (rect != null && layer != null){
        const circleNum = 100
        const circleRadius = 4
        // const circleNum = 400
        const l = rect.getLength()
        const speeds:SpeedMap = {
          0: 5,
          50: 6,
          100: 7,
          150: 7.5,
          200: 6,
          300: 5,
          400: 4.5,
        }
        const speeds2:SpeedMap = {
          0: 3,
          50: 5,
          100: 7,
          150: 7.5,
          200: 6,
          300: 5,
          400: 6.5,
        }
        const speeds3:SpeedMap = {
          0: 4,
          50: 5,
          100: 7,
          150: 7.5,
          200: 8,
          300: 9,
          400: 5.5,
        }
        const track = new Track(speeds, "blue")
        const track2 = new Track(speeds2, "red")
        const track3 = new Track(speeds3, "green")
        const circles = range(circleNum).map((i) => {
          const p = getAbsolutePointAtLength(rect, i * l / circleNum)
          const circleConfig:CircleConfig = {x: p.x, y: p.y, radius: circleRadius, fill: 'black'}
          const spotConfig:SpotConfig = {
            circleLength: 400,
            current: i,
            total: circleNum,
            lineLength: 75,
            updateInterval: Duration.fromMillis(100),
          }
          const spot = new Spot(i,spotConfig,circleConfig)
          spot.setTracks([track, track2, track3])
          spot.setCallback(()=>{layer.draw()})
          return spot
        })
        circles.forEach(c => {
          layer.add(c.circle)
        })
        const pStartFn = () => {
          circles.forEach(c => {
            c.start()
          })
        }
        setStartFn(() => pStartFn)
      }
    }, [])
    return(
      <>
        <Stage width={window.innerWidth} height={window.innerHeight/3}>
          <Layer ref={layerRef}>
            <Path data={sameRadiusRoundedRectData(rectWidth, rectHeight, 119)} height={rectHeight} width={rectHeight} x={x} y={25} stroke="blue" ref={rectRef} strokeWidth={0.75} />
          </Layer>
        </Stage>
        <button onClick={startFn}>Start</button>
      </>
    )
  }
  return (
    <>
      <Canvas/>
    </>
  )
}

export default App

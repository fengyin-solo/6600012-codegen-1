import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simulation'
import { applyPhysics } from '../simulations/physics'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function ParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const particles = useSimStore(s => s.particles)
  const mode = useSimStore(s => s.mode)
  const gravity = useSimStore(s => s.gravity)
  const damping = useSimStore(s => s.damping)
  const bounce = useSimStore(s => s.bounce)
  const attractorStrength = useSimStore(s => s.attractorStrength)
  const slowMotion = useSimStore(s => s.slowMotion)
  const paused = useSimStore(s => s.paused)
  const isRecording = useSimStore(s => s.isRecording)
  const isPlaying = useSimStore(s => s.isPlaying)
  const timeline = useSimStore(s => s.timeline)
  const currentFrameIndex = useSimStore(s => s.currentFrameIndex)
  const recordInterval = useSimStore(s => s.recordInterval)
  const setFps = useSimStore(s => s.setFps)
  const setTotalEnergy = useSimStore(s => s.setTotalEnergy)
  const recordFrame = useSimStore(s => s.recordFrame)
  const setCurrentFrameIndex = useSimStore(s => s.setCurrentFrameIndex)
  const getPlaybackParticles = useSimStore(s => s.getPlaybackParticles)

  const colorArray = useMemo(
    () => new Float32Array(particles.length * 3),
    [particles.length]
  )

  useMemo(() => {
    particles.forEach((p, i) => {
      tempColor.set(p.color)
      colorArray[i * 3] = tempColor.r
      colorArray[i * 3 + 1] = tempColor.g
      colorArray[i * 3 + 2] = tempColor.b
    })
  }, [particles, colorArray])

  const fpsCounter = useRef({ frames: 0, lastTime: performance.now() })
  const recordCounter = useRef(0)
  const playbackAccumulator = useRef(0)

  useFrame((_, delta) => {
    if (!meshRef.current) return

    let displayParticles = particles

    if (isPlaying && timeline.length > 0) {
      playbackAccumulator.current += delta
      const frameDuration = 1 / 30
      if (playbackAccumulator.current >= frameDuration) {
        playbackAccumulator.current -= frameDuration
        const nextIndex = currentFrameIndex + 1
        if (nextIndex < timeline.length) {
          setCurrentFrameIndex(nextIndex)
        } else {
          setCurrentFrameIndex(0)
        }
      }
      displayParticles = getPlaybackParticles()
    } else {
      if (!paused) {
        const dt = slowMotion ? delta * 0.1 : delta
        const updated = applyPhysics(particles, mode, gravity, damping, bounce, attractorStrength, dt)
        displayParticles = updated

        if (isRecording) {
          recordCounter.current++
          if (recordCounter.current >= recordInterval) {
            recordCounter.current = 0
            recordFrame(updated)
          }
        }
      } else {
        displayParticles = particles
      }
    }

    let totalEnergy = 0
    displayParticles.forEach((p, i) => {
      tempObject.position.set(...p.position)
      const scale = p.radius * 2
      tempObject.scale.set(scale, scale, scale)
      tempObject.updateMatrix()
      meshRef.current!.setMatrixAt(i, tempObject.matrix)
      totalEnergy += 0.5 * p.mass * (p.velocity[0]**2 + p.velocity[1]**2 + p.velocity[2]**2)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    setTotalEnergy(totalEnergy)

    fpsCounter.current.frames++
    const now = performance.now()
    if (now - fpsCounter.current.lastTime > 1000) {
      setFps(fpsCounter.current.frames)
      fpsCounter.current.frames = 0
      fpsCounter.current.lastTime = now
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <sphereGeometry args={[1, 8, 8]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </sphereGeometry>
      <meshPhongMaterial vertexColors toneMapped={false} shininess={80} />
    </instancedMesh>
  )
}

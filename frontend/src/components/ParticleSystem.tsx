import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simulation'
import { applyPhysics } from '../simulations/physics'
import type { Particle } from '../types'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function ParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const storeParticles = useSimStore(s => s.particles)

  const particleStateRef = useRef<Particle[]>([])
  const fpsCounter = useRef({ frames: 0, lastTime: performance.now() })
  const recordCounter = useRef(0)
  const playbackAccumulator = useRef(0)
  const debugRef = useRef({ frameCount: 0, recordCalls: 0, lastRecordedAt: 0 })

  useEffect(() => {
    particleStateRef.current = storeParticles.map(p => ({
      ...p,
      position: [...p.position] as [number, number, number],
      velocity: [...p.velocity] as [number, number, number],
    }))
    recordCounter.current = 0
    playbackAccumulator.current = 0
    debugRef.current = { frameCount: 0, recordCalls: 0, lastRecordedAt: 0 }
    if (typeof window !== 'undefined') {
      (window as any).__particleDebug = {
        particleStateRef,
        recordCounter,
        playbackAccumulator,
        debugRef,
      }
    }
  }, [storeParticles])

  const colorArray = useMemo(
    () => new Float32Array(storeParticles.length * 3),
    [storeParticles.length]
  )

  useMemo(() => {
    storeParticles.forEach((p, i) => {
      tempColor.set(p.color)
      colorArray[i * 3] = tempColor.r
      colorArray[i * 3 + 1] = tempColor.g
      colorArray[i * 3 + 2] = tempColor.b
    })
  }, [storeParticles, colorArray])

  useFrame((_, delta) => {
    if (!meshRef.current || particleStateRef.current.length === 0) return

    const state = useSimStore.getState()
    let displayParticles = particleStateRef.current

    if (state.isPlaying && state.timeline.length > 0) {
      playbackAccumulator.current += delta
      const frameDuration = 1 / 30
      if (playbackAccumulator.current >= frameDuration) {
        playbackAccumulator.current -= frameDuration
        const nextIndex = state.currentFrameIndex + 1
        if (nextIndex < state.timeline.length) {
          state.setCurrentFrameIndex(nextIndex)
        } else {
          state.setCurrentFrameIndex(0)
        }
      }
      const latestState = useSimStore.getState()
      const frame = latestState.timeline[latestState.currentFrameIndex]
      if (frame) {
        displayParticles = particleStateRef.current.map((p, i) => {
          const recorded = frame.particles[i]
          if (!recorded) return p
          return {
            ...p,
            position: [...recorded.position] as [number, number, number],
            velocity: [...recorded.velocity] as [number, number, number],
          }
        })
      }
    } else {
      playbackAccumulator.current = 0
      if (!state.paused) {
        const dt = state.slowMotion ? delta * 0.1 : delta
        const updated = applyPhysics(
          particleStateRef.current,
          state.mode,
          state.gravity,
          state.damping,
          state.bounce,
          state.attractorStrength,
          dt
        )
        particleStateRef.current = updated
        displayParticles = updated

        if (state.isRecording) {
          recordCounter.current++
          if (recordCounter.current >= state.recordInterval) {
            recordCounter.current = 0
            state.recordFrame(updated)
          }
        }
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
    state.setTotalEnergy(totalEnergy)

    fpsCounter.current.frames++
    const now = performance.now()
    if (now - fpsCounter.current.lastTime > 1000) {
      state.setFps(fpsCounter.current.frames)
      fpsCounter.current.frames = 0
      fpsCounter.current.lastTime = now
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, storeParticles.length]}>
      <sphereGeometry args={[1, 8, 8]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </sphereGeometry>
      <meshPhongMaterial vertexColors toneMapped={false} shininess={80} />
    </instancedMesh>
  )
}

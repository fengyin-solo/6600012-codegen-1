import { create } from 'zustand'
import type { SimMode, SimulationParams, Particle, TrajectoryFrame, PlaybackState } from '../types'

const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c084fc','#f472b6','#38bdf8']

function randomParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    position: [
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    ] as [number, number, number],
    velocity: [
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
    ] as [number, number, number],
    mass: 0.5 + Math.random() * 2,
    color: COLORS[i % COLORS.length],
    radius: 0.15 + Math.random() * 0.35,
  }))
}

interface SimStore extends SimulationParams, PlaybackState {
  particles: Particle[]
  fps: number
  totalEnergy: number
  setMode: (mode: SimMode) => void
  setParticleCount: (count: number) => void
  setParam: <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => void
  reset: () => void
  setFps: (fps: number) => void
  setTotalEnergy: (e: number) => void
  applyPreset: (preset: Partial<SimulationParams>) => void
  startRecording: () => void
  stopRecording: () => void
  recordFrame: (particles: Particle[]) => void
  startPlayback: () => void
  stopPlayback: () => void
  setCurrentFrameIndex: (index: number) => void
  clearTimeline: () => void
  getPlaybackParticles: () => Particle[]
  setMaxRecordFrames: (frames: number) => void
  setRecordInterval: (interval: number) => void
}

export const useSimStore = create<SimStore>((set, get) => {
  if (typeof window !== 'undefined') {
    (window as any).__simStore = { set, get }
  }
  return ({
  mode: 'gravity',
  particleCount: 300,
  gravity: 9.8,
  damping: 0.02,
  bounce: 0.7,
  attractorStrength: 5,
  slowMotion: false,
  paused: false,
  particles: randomParticles(300),
  fps: 0,
  totalEnergy: 0,
  isRecording: false,
  isPlaying: false,
  timeline: [],
  currentFrameIndex: 0,
  maxRecordFrames: 1800,
  recordInterval: 2,
  setMode: (mode) => set({ mode }),
  setParticleCount: (count) => set({ particleCount: count, particles: randomParticles(count) }),
  setParam: (key, value) => set({ [key]: value } as any),
  reset: () => {
    const { particleCount } = get()
    set({ particles: randomParticles(particleCount) })
  },
  setFps: (fps) => set({ fps }),
  setTotalEnergy: (e) => set({ totalEnergy: e }),
  applyPreset: (preset) => {
    set({ ...preset } as any)
    const { particleCount } = get()
    set({ particles: randomParticles(particleCount) })
  },
  startRecording: () => {
    set({ isRecording: true, timeline: [], currentFrameIndex: 0, isPlaying: false })
  },
  stopRecording: () => {
    set({ isRecording: false })
  },
  recordFrame: (particles: Particle[]) => {
    const { timeline, maxRecordFrames } = get()
    const frame: TrajectoryFrame = {
      timestamp: performance.now(),
      particles: particles.map(p => ({
        position: [...p.position] as [number, number, number],
        velocity: [...p.velocity] as [number, number, number],
      })),
    }
    const newTimeline = [...timeline, frame]
    if (newTimeline.length > maxRecordFrames) {
      newTimeline.shift()
    }
    set({ timeline: newTimeline })
  },
  startPlayback: () => {
    const { timeline } = get()
    if (timeline.length === 0) return
    set({ isPlaying: true, isRecording: false, paused: true })
  },
  stopPlayback: () => {
    set({ isPlaying: false, paused: false })
  },
  setCurrentFrameIndex: (index: number) => {
    const { timeline } = get()
    const clampedIndex = Math.max(0, Math.min(index, timeline.length - 1))
    set({ currentFrameIndex: clampedIndex })
  },
  clearTimeline: () => {
    set({ timeline: [], currentFrameIndex: 0, isPlaying: false, isRecording: false })
  },
  getPlaybackParticles: () => {
    const { timeline, currentFrameIndex, particles } = get()
    if (timeline.length === 0) return particles
    const frame = timeline[currentFrameIndex]
    if (!frame) return particles
    return particles.map((p, i) => {
      const recorded = frame.particles[i]
      if (!recorded) return p
      return {
        ...p,
        position: [...recorded.position] as [number, number, number],
        velocity: [...recorded.velocity] as [number, number, number],
      }
    })
  },
  setMaxRecordFrames: (frames: number) => set({ maxRecordFrames: frames }),
  setRecordInterval: (interval: number) => set({ recordInterval: interval }),
})})

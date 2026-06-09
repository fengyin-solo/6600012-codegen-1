import { useSimStore } from '../store/simulation'
import type { SimMode } from '../types'

const MODES: { value: SimMode; label: string; icon: string }[] = [
  { value: 'gravity', label: '重力吸引', icon: '🌍' },
  { value: 'collision', label: '弹性碰撞', icon: '💥' },
  { value: 'fluid', label: '流体模拟', icon: '💧' },
  { value: 'vortex', label: '漩涡旋转', icon: '🌀' },
]

const PRESETS = [
  { id: 'solar', name: '太阳系', params: { mode: 'gravity' as SimMode, gravity: 5, attractorStrength: 8, damping: 0.01, particleCount: 200 } },
  { id: 'billiards', name: '台球碰撞', params: { mode: 'collision' as SimMode, gravity: 0, damping: 0.005, bounce: 0.95, particleCount: 50 } },
  { id: 'lava', name: '熔岩灯', params: { mode: 'fluid' as SimMode, gravity: 3, damping: 0.05, particleCount: 150 } },
  { id: 'tornado', name: '龙卷风', params: { mode: 'vortex' as SimMode, gravity: 2, attractorStrength: 12, damping: 0.02, particleCount: 400 } },
]

function formatDuration(frames: number): string {
  const seconds = Math.floor(frames / 30)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ControlPanel() {
  const store = useSimStore()
  const timelineLength = store.timeline.length
  const progressPercent = timelineLength > 0 
    ? ((store.currentFrameIndex + 1) / timelineLength) * 100 
    : 0

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto flex flex-col gap-4">
      <h2 className="text-lg font-bold text-white">粒子物理模拟器</h2>

      {/* Trajectory Playback Section */}
      <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
        <label className="text-xs text-gray-400 block mb-2 font-semibold">🎬 轨迹回放</label>
        
        {/* Record Controls */}
        <div className="flex gap-2 mb-3">
          {!store.isRecording ? (
            <button
              onClick={() => store.startRecording()}
              disabled={store.isPlaying}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium"
            >
              ⏺ 开始录制
            </button>
          ) : (
            <button
              onClick={() => store.stopRecording()}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium animate-pulse"
            >
              ⏹ 停止录制
            </button>
          )}
          <button
            onClick={() => store.clearTimeline()}
            disabled={timelineLength === 0}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded text-sm"
          >
            🗑
          </button>
        </div>

        {/* Recording Status */}
        <div className="text-xs text-gray-400 mb-3 flex justify-between">
          <span>
            {store.isRecording ? (
              <span className="text-red-400">● 正在录制...</span>
            ) : timelineLength > 0 ? (
              <span className="text-green-400">已录制 {timelineLength}/{store.maxRecordFrames} 帧</span>
            ) : (
              <span>暂无录制数据</span>
            )}
          </span>
          <span>时长: {formatDuration(timelineLength)}</span>
        </div>

        {/* Timeline Progress Bar */}
        {timelineLength > 0 && (
          <div className="mb-3">
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1 overflow-hidden">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0:00</span>
              <span>{formatDuration(store.currentFrameIndex + 1)}</span>
              <span>{formatDuration(timelineLength)}</span>
            </div>
          </div>
        )}

        {/* Timeline Slider */}
        {timelineLength > 0 && (
          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">时间轴</label>
            <input
              type="range"
              min={0}
              max={timelineLength - 1}
              step={1}
              value={store.currentFrameIndex}
              onChange={e => store.setCurrentFrameIndex(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-xs text-gray-500 text-center mt-1">
              帧 {store.currentFrameIndex + 1} / {timelineLength}
            </div>
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (store.isPlaying) {
                store.stopPlayback()
              } else {
                store.startPlayback()
              }
            }}
            disabled={timelineLength === 0}
            className={`flex-1 py-2 rounded text-sm font-medium text-white disabled:bg-gray-600 disabled:cursor-not-allowed ${
              store.isPlaying ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {store.isPlaying ? '⏸ 暂停回放' : '▶ 开始回放'}
          </button>
          <button
            onClick={() => store.setCurrentFrameIndex(0)}
            disabled={timelineLength === 0}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded text-sm"
          >
            ⏮
          </button>
          <button
            onClick={() => store.setCurrentFrameIndex(timelineLength - 1)}
            disabled={timelineLength === 0}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded text-sm"
          >
            ⏭
          </button>
        </div>

        {/* Recording Settings */}
        <div className="mt-4 pt-3 border-t border-gray-700">
          <label className="text-xs text-gray-500 block mb-2">录制设置</label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400">录制间隔: 每 {store.recordInterval} 帧</label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={store.recordInterval}
                onChange={e => store.setRecordInterval(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">最大帧数: {store.maxRecordFrames}</label>
              <input
                type="range"
                min={300}
                max={3600}
                step={300}
                value={store.maxRecordFrames}
                onChange={e => store.setMaxRecordFrames(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mode */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">模拟模式</label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(m => (
            <button
              key={m.value}
              onClick={() => store.setMode(m.value)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                store.mode === m.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">预设场景</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => store.applyPreset(p.params)}
              className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-full"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Particle Count */}
      <div>
        <label className="text-xs text-gray-400">粒子数量: {store.particleCount}</label>
        <input type="range" min={10} max={800} step={10}
          value={store.particleCount}
          onChange={e => store.setParticleCount(Number(e.target.value))}
          className="w-full accent-blue-500" />
      </div>

      {/* Gravity */}
      <div>
        <label className="text-xs text-gray-400">重力: {store.gravity.toFixed(1)}</label>
        <input type="range" min={-20} max={20} step={0.5}
          value={store.gravity}
          onChange={e => store.setParam('gravity', Number(e.target.value))}
          className="w-full accent-green-500" />
      </div>

      {/* Damping */}
      <div>
        <label className="text-xs text-gray-400">阻尼: {store.damping.toFixed(3)}</label>
        <input type="range" min={0} max={0.5} step={0.005}
          value={store.damping}
          onChange={e => store.setParam('damping', Number(e.target.value))}
          className="w-full accent-yellow-500" />
      </div>

      {/* Bounce */}
      <div>
        <label className="text-xs text-gray-400">弹性: {store.bounce.toFixed(2)}</label>
        <input type="range" min={0} max={1} step={0.05}
          value={store.bounce}
          onChange={e => store.setParam('bounce', Number(e.target.value))}
          className="w-full accent-orange-500" />
      </div>

      {/* Attractor */}
      <div>
        <label className="text-xs text-gray-400">吸引力: {store.attractorStrength.toFixed(1)}</label>
        <input type="range" min={0} max={20} step={0.5}
          value={store.attractorStrength}
          onChange={e => store.setParam('attractorStrength', Number(e.target.value))}
          className="w-full accent-pink-500" />
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => store.setParam('paused', !store.paused)}
          className={`flex-1 py-2 rounded font-medium text-sm ${store.paused ? 'bg-green-600' : 'bg-red-600'} text-white`}
        >
          {store.paused ? '▶ 继续' : '⏸ 暂停'}
        </button>
        <button
          onClick={() => store.setParam('slowMotion', !store.slowMotion)}
          className={`flex-1 py-2 rounded font-medium text-sm ${store.slowMotion ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'}`}
        >
          🐌 慢动作
        </button>
      </div>
      <button
        onClick={() => store.reset()}
        className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
      >
        🔄 重置粒子
      </button>
    </div>
  )
}

function Crossfader({ value = 0.5, onChange }) {
  const handleChange = (e) => {
    const newValue = parseInt(e.target.value, 10) / 100
    onChange?.(newValue)
  }

  const displayValue = Math.round(value * 100)

  return (
    <div className="bg-slate-700/30 rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-4">
        {/* Deck A Label */}
        <span className="text-lg font-bold text-purple-400 w-8 text-center">A</span>

        {/* Crossfader Track */}
        <div className="flex-1 relative">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>◀</span>
            <span className="text-slate-400">CROSSFADER</span>
            <span>▶</span>
          </div>

          {/* Slider Track */}
          <div className="relative h-4 bg-slate-800 rounded-full border border-slate-600">
            {/* Center Marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500/50 -translate-x-1/2"></div>

            {/* Working Crossfader Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={displayValue}
              onChange={handleChange}
              className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-6
                [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-purple-500
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-purple-300
                [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:hover:bg-purple-400
                [&::-webkit-slider-thumb]:transition-colors
                [&::-moz-range-thumb]:w-6
                [&::-moz-range-thumb]:h-6
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-purple-500
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-purple-300
                [&::-moz-range-thumb]:shadow-md"
              aria-label="Crossfader"
            />
          </div>

          {/* Visual indicator text */}
          <div className="text-center mt-2 text-xs text-slate-500">
            A ◀──────▶ B
          </div>
        </div>

        {/* Deck B Label */}
        <span className="text-lg font-bold text-purple-400 w-8 text-center">B</span>
      </div>
    </div>
  )
}

export default Crossfader

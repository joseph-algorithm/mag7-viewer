import { useMemo } from 'react'

import {
	PRESETS,
	type Preset,
	addDays,
	clampSpan,
	daysBetween,
	earliestDate,
  matchingPreset,
  presetRange,
} from '../lib/dateRange'
import type { DateRange } from '../lib/rangeSelection'

interface MasterRangeSliderProps {
	start: string
  end: string
  today: string
  onChange: (range: DateRange) => void
  onCommit: (range: DateRange) => void
}

/** Year boundaries inside the slider's span, for the tick marks. */
function yearTicks(min: string, max: string): { label: string; percent: number }[] {
	const total = daysBetween(min, max)
	const firstYear = Number(min.slice(0, 4)) + 1
	const lastYear = Number(max.slice(0, 4))
	const ticks = []
	for (let year = firstYear; year <= lastYear; year += 1) {
		const date = `${year}-01-01`
		ticks.push({ label: String(year), percent: (daysBetween(min, date) / total) * 100 })
	}
	return ticks
}

/**
 * The master timeline: its selected window *is* the fetched range.
 *
 * Deliberately a different tier from the per-card sliders — full width,
 * labelled, with year ticks and its dates shown — because the two look alike
 * but mean different things. A card slider zooms within data already loaded;
 * this one decides what gets loaded.
 *
 * Built from two native range inputs so keyboard support (arrows, Home/End)
 * comes for free rather than being reimplemented badly.
 */
export function MasterRangeSlider({
	start,
	end,
  today,
  onChange,
  onCommit,
}: MasterRangeSliderProps) {
	const min = useMemo(() => earliestDate(today), [today])
	const maxOffset = useMemo(() => daysBetween(min, today), [min, today])

	const startOffset = daysBetween(min, start)
	const endOffset = daysBetween(min, end)
	const active = matchingPreset({ start, end }, today)
	const ticks = useMemo(() => yearTicks(min, today), [min, today])

  function rangeFromOffsets(
    nextStart: number,
    nextEnd: number,
    moved: 'start' | 'end',
  ): DateRange {
    const clamped = clampSpan(nextStart, nextEnd, maxOffset, moved)
    return {
      start: addDays(min, clamped.startOffset),
      end: addDays(min, clamped.endOffset),
    }
  }

  function preview(nextStart: number, nextEnd: number, moved: 'start' | 'end') {
    onChange(rangeFromOffsets(nextStart, nextEnd, moved))
  }

  function commit(nextStart: number, nextEnd: number, moved: 'start' | 'end') {
    onCommit(rangeFromOffsets(nextStart, nextEnd, moved))
  }

  function applyPreset(preset: Preset) {
    onCommit(presetRange(preset, today))
	}

	const selectedLeft = (startOffset / maxOffset) * 100
	const selectedWidth = ((endOffset - startOffset) / maxOffset) * 100

	return (
		<section className="master-range" aria-label="Date range">
			<div className="master-range-top">
				<span className="master-range-label">Range</span>
				<div className="master-range-presets" role="group" aria-label="Range presets">
					{PRESETS.map((preset) => (
						<button
							key={preset}
						type="button"
						className="range-preset"
						aria-pressed={active === preset}
						onClick={() => applyPreset(preset)}
						>
							{preset}
						</button>
					))}
				</div>
			</div>

			<div className="master-range-track">
				<div
					className="master-range-selected"
					style={{ left: `${selectedLeft}%`, width: `${selectedWidth}%` }}
				/>
				{ticks.map((tick) => (
					<span key={tick.label} className="master-range-tick" style={{ left: `${tick.percent}%` }}>
						<span className="master-range-tick-label">{tick.label}</span>
					</span>
				))}

				<input
					type="range"
					className="master-range-input"
					min={0}
					max={maxOffset}
      value={startOffset}
      aria-label="Range start"
      aria-valuetext={start}
      onChange={(event) => preview(Number(event.target.value), endOffset, 'start')}
      onPointerUp={(event) => commit(Number(event.currentTarget.value), endOffset, 'start')}
      onPointerCancel={(event) =>
        commit(Number(event.currentTarget.value), endOffset, 'start')
      }
      onLostPointerCapture={(event) =>
        commit(Number(event.currentTarget.value), endOffset, 'start')
      }
      onKeyUp={(event) => commit(Number(event.currentTarget.value), endOffset, 'start')}
      onBlur={(event) => commit(Number(event.currentTarget.value), endOffset, 'start')}
				/>
				<input
					type="range"
					className="master-range-input"
					min={0}
					max={maxOffset}
      value={endOffset}
      aria-label="Range end"
      aria-valuetext={end}
      onChange={(event) => preview(startOffset, Number(event.target.value), 'end')}
      onPointerUp={(event) => commit(startOffset, Number(event.currentTarget.value), 'end')}
      onPointerCancel={(event) =>
        commit(startOffset, Number(event.currentTarget.value), 'end')
      }
      onLostPointerCapture={(event) =>
        commit(startOffset, Number(event.currentTarget.value), 'end')
      }
      onKeyUp={(event) => commit(startOffset, Number(event.currentTarget.value), 'end')}
      onBlur={(event) => commit(startOffset, Number(event.currentTarget.value), 'end')}
				/>
			</div>

			<div className="master-range-dates">
				<span>{start}</span>
				<span>{end}</span>
			</div>
		</section>
	)
}

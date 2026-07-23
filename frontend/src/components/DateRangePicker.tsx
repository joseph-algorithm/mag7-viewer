import type { DateRange } from '../lib/rangeSelection'

interface DateRangePickerProps {
  start: string
  end: string
  onChange: (range: DateRange) => void
}

/**
 * Native date inputs: keyboard accessible, localized by the browser, no dependency.
 * `max` on each input keeps the range ordered without needing an error state.
 */
export function DateRangePicker({ start, end, onChange }: DateRangePickerProps) {
	const today = new Date().toISOString().slice(0, 10)

	return (
		<fieldset className="date-range">
			<legend className="sr-only">Date range</legend>

			<label htmlFor="start-date">
				Start
				<input
					id="start-date"
					type="date"
					value={start}
					max={end || today}
					onChange={(event) => onChange({ start: event.target.value, end })}
				/>
			</label>

			<label htmlFor="end-date">
				End
				<input
					id="end-date"
					type="date"
					value={end}
					min={start}
					max={today}
					onChange={(event) => onChange({ start, end: event.target.value })}
				/>
			</label>
		</fieldset>
	)
}

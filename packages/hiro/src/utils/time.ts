const timeMultipliers: { [key: string]: number } = {
	s: 1000,
	m: 1000 * 60,
	h: 1000 * 60 * 60,
	d: 1000 * 60 * 60 * 24,
	w: 1000 * 60 * 60 * 24 * 7,
	y: 1000 * 60 * 60 * 24 * 365,
}

export function parseDuration(durationStr: string): number | null {
	const regex = /(\d+)([smhdwy])/
	const match = durationStr.match(regex)

	if (!match || !match[1] || !match[2]) {
		return null
	}

	const [, valueStr, unit] = match
	const value = parseInt(valueStr, 10)
	const multiplier = timeMultipliers[unit]

	if (Number.isNaN(value) || !multiplier) {
		return null
	}

	return value * multiplier
}

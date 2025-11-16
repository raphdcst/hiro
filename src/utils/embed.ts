import { Colors, EmbedBuilder, type APIEmbed } from 'discord.js'

type EmbedLevel = 'success' | 'error' | 'warning' | 'info'

type EmbedData = APIEmbed & {
	level?: EmbedLevel
}

export function getColorFromEmbedType(type?: EmbedLevel): number {
	switch (type) {
		case 'success':
			return Colors.Green
		case 'error':
			return Colors.Red
		case 'warning':
			return Colors.Orange
		case 'info':
			return Colors.Blurple
		default:
			return Colors.Grey
	}
}

export function createEmbed(data: EmbedData): EmbedBuilder {
	const mergedData = {
		...data,
		color: getColorFromEmbedType(data.level),
	}

	return EmbedBuilder.from(mergedData)
}

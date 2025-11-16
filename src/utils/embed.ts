import { Colors, EmbedBuilder, type APIEmbed } from 'discord.js'

type EmbedLevel = 'success' | 'error' | 'warning' | 'info'

export type EmbedData = APIEmbed & {
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

export const createEmbedFactory = (embedDefaults: Partial<EmbedData>) => {
	return function createEmbed(
		data: EmbedData,
		useDefaults: boolean = true,
	): EmbedBuilder {
		const mergedData = {
			...(useDefaults ? embedDefaults : {}),
			...data,
			color: getColorFromEmbedType(data.level),
		}

		return EmbedBuilder.from(mergedData)
	}
}

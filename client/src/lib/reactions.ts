// Presentation-only: backend only stores a boolean like, no persisted reaction type.
export const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'haha', emoji: '😄', label: 'Haha' },
  { key: 'angry', emoji: '😠', label: 'Angry' },
  { key: 'cry', emoji: '😢', label: 'Cry' },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]['key'];

export function reactionLabel(key: ReactionKey | null) {
  return REACTIONS.find((r) => r.key === key)?.label ?? 'Like';
}

export function reactionEmoji(key: ReactionKey | null) {
  return REACTIONS.find((r) => r.key === key)?.emoji ?? REACTIONS[0].emoji;
}

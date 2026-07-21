import math
from collections import Counter


class SimpleEmbeddingProvider:
    """Deterministic local embedding fallback for development and tests."""

    def embed(self, text: str) -> dict[str, float]:
        words = [word.lower() for word in text.split() if word.strip()]
        counts = Counter(words)
        norm = math.sqrt(sum(value * value for value in counts.values())) or 1
        return {word: value / norm for word, value in counts.items()}

    def similarity(self, left: str, right: str) -> float:
        left_vector = self.embed(left)
        right_vector = self.embed(right)
        return sum(value * right_vector.get(word, 0) for word, value in left_vector.items())

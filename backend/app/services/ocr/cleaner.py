import re
import unicodedata

class TextCleaner:
    """
    Standardized archival text post-processing and normalization.
    Cleans raw OCR output while preserving historical punctuation and paragraph boundaries.
    """

    @staticmethod
    def clean(text: str) -> str:
        if not text:
            return ""

        # 1. Unicode NFC normalization (critical for Indic scripts & accents)
        text = unicodedata.normalize("NFC", text)

        # 2. Normalize smart quotes, apostrophes, and dashes to standard Unicode
        text = text.replace("“", '"').replace("”", '"').replace("„", '"')
        text = text.replace("‘", "'").replace("’", "'").replace("`", "'")
        text = text.replace("—", " — ").replace("–", " – ")

        # 3. Fix soft hyphens and line-break hyphenation (e.g. "insti-\ntution" -> "institution")
        text = re.sub(r'(\w+)-\n+(\w+)', r'\1\2', text)

        # 4. Remove unprintable control characters (except newline, tab, carriage return)
        text = "".join(ch for ch in text if ch in ('\n', '\r', '\t') or unicodedata.category(ch)[0] != 'C')

        # 5. Clean whitespace within lines while preserving paragraph breaks
        lines = text.splitlines()
        cleaned_lines = []
        for line in lines:
            line_cleaned = re.sub(r'[ \t]+', ' ', line).strip()
            cleaned_lines.append(line_cleaned)

        result = "\n".join(cleaned_lines)
        # Collapse 3+ consecutive newlines to 2 (paragraph break)
        result = re.sub(r'\n{3,}', '\n\n', result)

        return result.strip()

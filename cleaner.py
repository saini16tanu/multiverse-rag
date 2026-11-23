"""Clean the page text BEFORE chunking."""
import re
from collections import Counter

from langchain_core.documents import Document


def clean(text: str) -> str:
    """Fix broken words, remove page numbers and extra spaces."""
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)                 # join words broken at line end
    text = re.sub(r"(?im)^\s*(page\s+)?\d+\s*$", "", text)       # remove page-number lines
    text = re.sub(r"(?im)^\s*page\s+\d+\s*(of\s+\d+)?\s*$", "", text)
    text = re.sub(r"[ \t]+", " ", text)                          # many spaces -> one space
    text = re.sub(r"\n{3,}", "\n\n", text)                       # many blank lines -> one
    return text.strip()


def drop_repeated_lines(texts: list[str], min_share: float = 0.6) -> list[str]:
    """Remove header/footer lines that appear on at least 60 percent of pages."""
    counts = Counter(line.strip() for t in texts for line in set(t.splitlines()) if line.strip())
    repeated = {line for line, n in counts.items() if n / len(texts) >= min_share}
    return ["\n".join(l for l in t.splitlines() if l.strip() not in repeated) for t in texts]


def clean_pages(pages: list[Document]) -> list[Document]:
    """Clean every page and keep its metadata (source, page)."""
    texts = [p.page_content for p in pages]
    if len(pages) >= 3:  # repeated headers only make sense with several pages
        texts = drop_repeated_lines(texts)

    cleaned = []
    for page, text in zip(pages, texts):
        cleaned.append(Document(page_content=clean(text), metadata=page.metadata))

    if not any(p.page_content for p in cleaned):
        raise ValueError("The PDF has no readable text (maybe it is a scanned image).")
    return cleaned

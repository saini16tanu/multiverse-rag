"""Split pages into chunks using Recursive Character Splitting.

It tries the biggest natural break first: paragraph, then line, then sentence, then word.
This keeps related sentences together.
"""
import hashlib

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import CHUNK_OVERLAP, CHUNK_SIZE


def make_chunks(pages: list[Document]) -> list[Document]:
    """Split the cleaned pages into small chunks with page numbers and stable IDs."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    # remove tiny chunks that carry no meaning
    chunks = [c for c in chunks if len(c.page_content) >= 20]

    for c in chunks:
        c.metadata["page"] = c.metadata.get("page", 0) + 1  # page numbers start from 1
        source = c.metadata.get("source", "")
        # same text from the same file always gets the same ID
        c.metadata["chunk_id"] = hashlib.sha256(f"{source}\n{c.page_content}".encode()).hexdigest()[:16]

    if not chunks:
        raise ValueError("No chunks were made. The PDF text is too short.")

    avg = sum(len(c.page_content) for c in chunks) / len(chunks)
    print(f"Total chunks: {len(chunks)}")
    print(f"Average chunk length: {avg:.0f} characters")
    print("First chunk:", chunks[0].page_content[:200])
    return chunks

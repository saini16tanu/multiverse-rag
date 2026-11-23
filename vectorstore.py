"""Embeddings and the Chroma vector database.

Use the SAME embedding model for saving and for searching.
"""
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

from config import CHROMA_DIR, COLLECTION_NAME, EMBEDDING_MODEL


def get_embeddings() -> HuggingFaceEmbeddings:
    """Return the model that turns text into vectors."""
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


def get_db() -> Chroma:
    """Open (or create) the Chroma database on disk."""
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_DIR,
    )


def save_chunks(chunks: list[Document]) -> Chroma:
    """Save the chunks into Chroma and return the database."""
    db = get_db()
    ids = [c.metadata["chunk_id"] for c in chunks]
    db.add_documents(chunks, ids=ids)  # same id = update, so running again makes no duplicates
    print(f"Saved {len(chunks)} chunks to Chroma")
    return db

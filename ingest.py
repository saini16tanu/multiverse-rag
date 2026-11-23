"""Run once: load -> clean -> chunk -> embed -> store."""
from chunker import make_chunks
from cleaner import clean_pages
from config import PDF_PATH, TOP_K
from loader import load_pdf
from vectorstore import save_chunks


def main() -> None:
    """Build the vector database from the PDF and do one test search."""
    try:
        pages = load_pdf(PDF_PATH)
        pages = clean_pages(pages)
    except (FileNotFoundError, ValueError) as e:
        print("Error:", e)
        return

    chunks = make_chunks(pages)
    db = save_chunks(chunks)

    print("\nTest search: What is this document about?")
    hits = db.similarity_search_with_score("What is this document about?", k=TOP_K)
    for doc, score in hits:
        # Chroma score is a distance: lower = closer
        print(round(score, 3), doc.metadata.get("page"), doc.page_content[:80].replace("\n", " "))


if __name__ == "__main__":
    main()

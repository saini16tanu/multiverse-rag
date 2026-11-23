"""Load the PDF into LangChain Documents."""
import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document


def load_pdf(path: str) -> list[Document]:
    """Load the PDF and return one Document per page."""
    if not os.path.exists(path):
        raise FileNotFoundError("PDF not found. Put it in the project folder.")

    pages = PyPDFLoader(path).load()  # one Document per page
    if not pages:
        raise ValueError("The PDF is empty. It has no pages.")

    print(f"Loaded {len(pages)} pages")
    print("First page metadata:", pages[0].metadata)
    return pages

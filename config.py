"""All settings for the RAG chatbot, kept in one place."""
import os

from dotenv import load_dotenv

load_dotenv()  # read GOOGLE_API_KEY from the .env file

PDF_PATH = "my_notes.pdf"          # only ONE PDF, kept in the project folder
CHUNK_SIZE = 800                   # characters, not tokens
CHUNK_OVERLAP = 120                # 15 percent overlap
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_DIR = "./chroma_db"
COLLECTION_NAME = "pdf_notes"
TOP_K = 4
LLM_MODEL = "gemini-3.5-flash"

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

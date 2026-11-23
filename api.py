"""FastAPI server for the MULTIVERSE RAG web app.

Run it from inside the rag_chatbot folder:
    uv run uvicorn api:app --reload --port 8000

It reuses the existing project files (config, loader, cleaner, chunker, vectorstore).
"""
import json
import os
import re
import threading
from contextlib import asynccontextmanager
from operator import itemgetter

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langchain_chroma import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough
from pydantic import BaseModel

from chunker import make_chunks
from cleaner import clean_pages
from config import (
    CHROMA_DIR,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    COLLECTION_NAME,
    GOOGLE_API_KEY,
    LLM_MODEL,
    TOP_K,
)
from loader import load_pdf
from vectorstore import get_embeddings

UPLOAD_DIR = "./data/uploads"
META_FILE = "./data/current.json"   # remembers which PDF is loaded (survives a restart)
MAX_BYTES = 20 * 1024 * 1024        # 20 MB
KEY_MISSING = "GOOGLE_API_KEY is missing. Put it in rag_chatbot/.env and restart the server."

# Shared objects, created once when the server starts
state: dict = {"db": None, "llm": None}
lock = threading.Lock()  # only one upload can rebuild the database at a time


def key_ok() -> bool:
    """True if a real Gemini key is set."""
    return bool(GOOGLE_API_KEY) and GOOGLE_API_KEY != "your_key_here"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the embedding model and open Chroma ONCE, when the server starts."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print("Loading embedding model (all-MiniLM-L6-v2)...")
    embeddings = get_embeddings()
    state["db"] = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )
    if key_ok():
        from langchain_google_genai import ChatGoogleGenerativeAI
        state["llm"] = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0, timeout=60)
    else:
        print("\n" + "!" * 70 + f"\n  {KEY_MISSING}\n" + "!" * 70 + "\n")
    print("Server ready.")
    yield


app = FastAPI(title="Multiverse RAG API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- small helpers ----------

def chunk_count() -> int:
    """How many chunks are stored in Chroma right now."""
    return state["db"]._collection.count()


def read_meta() -> dict | None:
    """Read info about the current PDF, if there is one."""
    if chunk_count() == 0:
        return None
    if os.path.exists(META_FILE):
        with open(META_FILE) as f:
            return json.load(f)
    # Old database made by ingest.py: rebuild the info from the stored chunks
    data = state["db"].get(include=["metadatas"])
    metas = data["metadatas"]
    pages = max((m.get("page", 0) for m in metas), default=0)
    source = metas[0].get("source", "document.pdf") if metas else "document.pdf"
    return {"file": os.path.basename(source), "pages": pages, "chunks": len(metas)}


def safe_name(name: str) -> str:
    """Keep only safe characters in the file name."""
    name = os.path.basename(name or "document.pdf")
    name = re.sub(r"[^\w.\- ]", "_", name).strip() or "document.pdf"
    return name


def format_docs(docs: list) -> str:
    """Join the retrieved chunks into one text, with page labels."""
    return "\n\n".join(f"[page {d.metadata.get('page')}] {d.page_content}" for d in docs)


# ---------- prompts ----------

rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful study assistant. Answer using only the context. "
               "Cite pages like [page 12]. "
               "If the context does not contain the answer, say you do not know."),
    ("human", "Context:\n{context}\n\nQuestion: {question}"),
])

condense_prompt = ChatPromptTemplate.from_messages([
    ("system", "Rewrite the user's last question as a stand-alone question that can be "
               "understood without the chat history. Keep the same language. "
               "Only return the question, nothing else."),
    ("human", "Chat history:\n{history}\n\nLast question: {question}\n\nStand-alone question:"),
])


# ---------- routes ----------

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/status")
def status() -> dict:
    meta = read_meta()
    if not meta:
        return {"has_pdf": False, "file": None, "pages": 0, "chunks": 0}
    return {"has_pdf": True, "file": meta["file"], "pages": meta["pages"], "chunks": meta["chunks"],
            "avg_chunk_length": meta.get("avg_chunk_length")}


@app.post("/upload")
def upload(file: UploadFile = File(...)) -> dict:
    # 1. Upload: check it is a PDF and not too big, then save it
    name = safe_name(file.filename)
    if not name.lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "This PDF is bigger than 20 MB.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "Please upload a PDF file.")
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(data)

    with lock:
        # 2. Load: one Document per page
        try:
            pages = load_pdf(path)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except Exception:
            raise HTTPException(400, "Could not read this PDF. It may be broken or locked.")

        # 3. Clean: join broken words, remove page numbers and repeated headers/footers
        try:
            pages = clean_pages(pages)
        except ValueError:
            raise HTTPException(400, "This PDF has no text. It may be scanned.")

        # 4. Split/Chunk: Recursive Character Splitting (800 chars, 120 overlap)
        try:
            chunks = make_chunks(pages)
        except ValueError:
            raise HTTPException(400, "This PDF has no text. It may be scanned.")

        # Same text twice = same ID; keep only one copy so Chroma does not complain
        unique = {}
        for c in chunks:
            unique.setdefault(c.metadata["chunk_id"], c)
        chunks = list(unique.values())

        # 5 + 6. Embed and store: a new upload REPLACES the old collection
        db: Chroma = state["db"]
        db.reset_collection()
        db.add_documents(chunks, ids=[c.metadata["chunk_id"] for c in chunks])

        avg = round(sum(len(c.page_content) for c in chunks) / len(chunks))
        meta = {"file": name, "pages": len(pages), "chunks": len(chunks), "avg_chunk_length": avg}
        with open(META_FILE, "w") as f:
            json.dump(meta, f)

    return {
        **meta,
        "chunk_method": "Recursive Character Splitting",
        "chunk_size": CHUNK_SIZE,
        "chunk_overlap": CHUNK_OVERLAP,
        "embedding_model": "all-MiniLM-L6-v2",
        "dimensions": 384,
    }


class Message(BaseModel):
    role: str  # "user" or "bot"
    text: str


class AskBody(BaseModel):
    question: str
    history: list[Message] = []


@app.post("/ask")
def ask(body: AskBody) -> dict:
    question = body.question.strip()
    if not question:
        raise HTTPException(400, "Please type a question.")
    if chunk_count() == 0:
        return {"answer": "Please upload a PDF first.", "sources": []}
    llm = state["llm"]
    if llm is None:
        raise HTTPException(500, KEY_MISSING)

    try:
        # Condense step: turn a follow-up like "and its time complexity?" into a full question
        history = body.history[-4:]
        if history:
            lines = "\n".join(f"{'User' if m.role == 'user' else 'Bot'}: {m.text}" for m in history)
            condense_chain = condense_prompt | llm | StrOutputParser()
            question = condense_chain.invoke({"history": lines, "question": question}).strip() or question

        # Plain RAG chain. The docs are retrieved ONCE and used for the answer AND the sources.
        retriever = state["db"].as_retriever(search_kwargs={"k": TOP_K})
        answer_chain = (
            {"context": itemgetter("docs") | RunnableLambda(format_docs),
             "question": itemgetter("question")}
            | rag_prompt | llm | StrOutputParser()
        )
        rag_chain = RunnableParallel(docs=retriever, question=RunnablePassthrough()).assign(answer=answer_chain)
        result = rag_chain.invoke(question)
    except Exception as e:
        raise HTTPException(502, f"Gemini error: {e}")

    # One source chip per page, in page order
    sources, seen = [], set()
    for d in result["docs"]:
        page = d.metadata.get("page")
        if page in seen:
            continue
        seen.add(page)
        snippet = " ".join(d.page_content.split())[:150]
        sources.append({"page": page, "snippet": snippet})
    sources.sort(key=lambda s: s["page"] or 0)

    return {"answer": result["answer"], "sources": sources}

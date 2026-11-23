"""Ask questions in the terminal and get answers from the PDF."""
import os

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

from config import CHROMA_DIR, GOOGLE_API_KEY, LLM_MODEL, TOP_K
from vectorstore import get_db


def format_docs(docs: list) -> str:
    """Join the retrieved chunks into one text, with page labels."""
    return "\n\n".join(f"[page {d.metadata.get('page')}] {d.page_content}" for d in docs)


rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer using only the context. Cite pages like [page 12]. "
               "If the context does not contain the answer, say you do not know."),
    ("human", "Context:\n{context}\n\nQuestion: {question}"),
])


def main() -> None:
    """Start the question-answer loop."""
    if not os.path.exists(CHROMA_DIR):
        print("Run ingest.py first")
        return
    if not GOOGLE_API_KEY or GOOGLE_API_KEY == "your_key_here":
        print("GOOGLE_API_KEY is missing. Put it in the .env file.")
        return

    db = get_db()
    retriever = db.as_retriever(search_kwargs={"k": TOP_K})
    model = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0, timeout=60)  # stop waiting after 60 seconds

    # retriever finds chunks -> prompt adds them as context -> model answers -> parser gives plain text
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | rag_prompt | model | StrOutputParser()
    )

    print("Ask me about the PDF. Type 'exit' to quit.")
    while True:
        question = input("\nYou: ").strip()
        if question.lower() == "exit":
            break
        if not question:
            continue
        try:
            answer = rag_chain.invoke(question)
            pages = sorted({d.metadata.get("page") for d in retriever.invoke(question)})
        except Exception as e:
            print("Error:", e)
            continue
        print("Bot:", answer)
        print("Sources: pages", pages)


if __name__ == "__main__":
    main()

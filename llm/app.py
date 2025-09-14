import os
import PyPDF2
import uvicorn
import tempfile

from typing import Union
from dotenv import load_dotenv
from pymongo import MongoClient
from pydantic import BaseModel, Field

from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, UploadFile, HTTPException

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_core.exceptions import OutputParserException
from langchain_community.document_loaders import PyPDFLoader
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser

from prompt import prompt_template
from helpers import assert_valid_pdf

load_dotenv()

app = FastAPI(title="Knowledge Graph Extractor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ContentSchema(BaseModel):
    labels: list[str] = Field(default=[], description="The list of labels in the resume")
    properties: dict = Field(default={}, description="The properties of the node")

class NodesSchema(BaseModel):
    nodes: list[ContentSchema]
    edges: list[tuple[str, str, str]] = Field(default=[], description="The list of edges in the knowledge graph for e.g ('Alice', 'Bob', 'knows')")
    root_entity_name: str = Field(default='', description="The name of the root entity. For e.g 'Bob Smith'")

class KnowledgeGraphResponse(BaseModel):
    nodes: list[ContentSchema]
    edges: list[tuple[str, str, str]]
    root_entity_name: str

class ExtractTextRequest(BaseModel):
    text: str
    doc_class: str = "resume"

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str

llm = ChatOpenAI(model="gpt-4o", temperature=0.1)
parser = PydanticOutputParser(pydantic_object=NodesSchema)

MONGODB_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGODB_URI)

DB_NAME = "depoiq"
COLLECTION_NAME = "embeddings"
INDEX_NAME = "knowledge-graph"

def extract_text_from_pdf(pdf_path: str) -> str:
    full_text = ""

    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                full_text += page.extract_text()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

    return full_text

def process_document(text: str, doc_class: str = "resume") -> KnowledgeGraphResponse:
    try:
        prompt = PromptTemplate(template=prompt_template)
        chain = prompt | llm
        
        response = chain.invoke({"text": text, "doc_class": doc_class})
        response_content = response.content if hasattr(response, 'content') else response
        
        try:
            parsed_response = parser.parse(response_content)
        except OutputParserException:
            fixed_response = response_content.replace("'", "\"")
            parsed_response = parser.parse(fixed_response)
        
        return KnowledgeGraphResponse(
            nodes=parsed_response.nodes,
            edges=parsed_response.edges,
            root_entity_name=parsed_response.root_entity_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

def create_embeddings(doc_path: str):
    embeddings = OpenAIEmbeddings()

    MONGODB_COLLECTION = client[DB_NAME][COLLECTION_NAME]

    vector_store = MongoDBAtlasVectorSearch(
        collection=MONGODB_COLLECTION,
        embedding=embeddings,
        index_name=INDEX_NAME,
        relevance_score_fn="cosine",
    )

    vector_store.create_vector_search_index(dimensions=1536)

    loader = PyPDFLoader(doc_path)
    docs = loader.load()

    vector_store.add_documents(documents=docs)

def query_document(question: str):
    embeddings = OpenAIEmbeddings()

    MONGODB_COLLECTION = client[DB_NAME][COLLECTION_NAME]

    vector_store = MongoDBAtlasVectorSearch(
        collection=MONGODB_COLLECTION,
        embedding=embeddings,
        index_name=INDEX_NAME,
        relevance_score_fn="cosine",
    )

    retriever = vector_store.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"k": 5, "score_threshold": 0.2},
    )
    
    relevant_docs = retriever.invoke(question)

    prompt_retriever = PromptTemplate(
        template = """
        You are a helpful assistant that can answer questions about the document.
        Here is the relevant document:
        {context}

        Question: {question}

        Answer:
        """
    )

    chain = prompt_retriever | llm

    response = chain.invoke({"context": relevant_docs, "question": question})
    return response.content


@app.get("/")
async def root():
    return {"message": "Knowledge Graph Extractor API is running"}

@app.post("/extract", response_model=KnowledgeGraphResponse)
async def extract_knowledge_graph_and_create_embeddings(file: UploadFile = File(...)):
    content = await file.read()
    assert_valid_pdf(file, content)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        try:
            temp_file.write(content)
            temp_file.flush()

            text = extract_text_from_pdf(temp_file.name)
            if not text.strip():
                raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")

            result = process_document(text)
            create_embeddings(temp_file.name)

            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        finally:
            try:
                os.unlink(temp_file.name)
            except:
                print("Error deleting temp file")

@app.post("/extract-text", response_model=KnowledgeGraphResponse)
async def extract_from_text(payload: ExtractTextRequest):
    txt = (payload.text or "").strip()

    if not txt:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = process_document(txt, payload.doc_class)

    return KnowledgeGraphResponse(
        nodes=result.nodes,
        edges=result.edges,
        root_entity_name=result.root_entity_name
    )

@app.post("/query")
async def query_document_endpoint(payload: QueryRequest):
    answer = query_document(payload.question)
    return {"answer": answer}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

import os
from typing import List
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from langchain.text_splitter import CharacterTextSplitter
# from langchain.docstore.document import Document
from langchain.chat_models import ChatOpenAI
from langchain.llms import OpenAI
from langchain.chains.llm import LLMChain
from langchain.prompts import PromptTemplate
from langchain.schema import SystemMessage, HumanMessage, AIMessage, BaseMessage
from dotenv import load_dotenv
from langchain.memory import ConversationBufferMemory
from langchain.memory.chat_message_histories.in_memory import ChatMessageHistory
from langchain.document_loaders import DirectoryLoader
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma
import os
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.text_splitter import CharacterTextSplitter
from langchain.document_loaders import DirectoryLoader
from langchain.chat_models import ChatOpenAI
from langchain.schema import SystemMessage
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder
from langchain.chains.llm import LLMChain
from langchain.memory import ConversationBufferMemory, VectorStoreRetrieverMemory

load_dotenv() 


# user submits proof statement in Latex
# use the initial prompt: 1) get all definitions 2) increment proof step and store in chat history, then propose next steps.
# 
app = FastAPI()
openai_api_key = os.getenv("OPENAI_API_KEY")
print("Loading pdf")
loader = DirectoryLoader('./doc/', glob='linear_map.pdf')
documents = loader.load()
print("uploaded")

text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
texts = text_splitter.split_documents(documents)
# Create embeddings
embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)
# load it into Chroma
vectorstore = Chroma.from_documents(texts, embeddings)

class Message(BaseModel):
    type: str
    message: str

class Prompt(BaseModel):
    question: str
    messages: List[Message]
    proofMessages: List[Message]
    # TODO: openai api key

def map_stored_messages_to_chat_messages(messages):
    result = []
    for message in messages:
        name = message.type
        text = message.message
        if name == "userMessage":
            result.append(HumanMessage(content=text))
        elif name == "apiMessage":
            result.append(AIMessage(content=text))
        elif name == "systemMessage":
            result.append(SystemMessage(content=text))
        else:
            raise ValueError("Role must be defined for generic messages")
    return result

@app.get("/api/python")
def hello_world():
    return {"message": "Hello World"}

@app.post("/api/chat")
def chat(prompt: Prompt):
    statement = prompt.question
    messages = prompt.messages
    proofMessages = prompt.proofMessages
    
    if len(proofMessages) < 2:
        raise HTTPException(status_code=400, detail="Please start the proof")

    # Validate inputs
    if not openai_api_key.strip() or not statement.strip():
        raise HTTPException(status_code=400, detail="Please check your inputs")
    else:
        try:
            # Define prompt
            template = """You are a chatbot tutoring a student how to write math proofs.
            You are the chat component, tasked at freely chatting with the user about any 
            questions he/she has. 
            If asked a simple definition question, respond in this standard format:
            1. Give a brief definition of the question
            2. intuitive explanation of the concept explained in first-principles
            3. Provide a very barebones example accurately explaining the concept. Include real numbers if required and define unknown variables.
            If you detect a math equation, provide both the standard font and LaTeX font.
            4. Provide contexual passage back to the proof and the step at hand. The current transcript of the proof is given by PROOF_STEPS
            
            PROOF_STEPS: """ + str(proofMessages) + """
            
            HISTORY: {chat_history}

            Human: {human_input}
            Chatbot:"""

            # You are a proof assistant helping students with mathematical thinking and understanding.
            # The user will provide you a math statement in LaTeX, and please respond any mathematical notation back in LaTeX.
            prompt = PromptTemplate(
                input_variables=["chat_history", "human_input"], template=template
            )

            messages = map_stored_messages_to_chat_messages(messages)
            history = ChatMessageHistory(messages=messages)
            # Initialize Memory
            memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True, chat_memory=history)
            # Initialize the OpenAI module, load and run the summarize chain
            llm = OpenAI(openai_api_key=openai_api_key)
            llm_chain = LLMChain(llm=llm, prompt=prompt, memory=memory, verbose=True)
            response = llm_chain.predict(human_input=statement)

            # Display summary
            return {"message": response}
        except Exception as e:
            print(e)
            raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/proof-step")
def nextProofStep(prompt: Prompt):
    statement = prompt.question
    messages = prompt.messages
    print("here")

    # Validate inputs
    if not openai_api_key.strip() or not statement.strip():
        raise HTTPException(status_code=400, detail="Please check your inputs")
    else:
        try:
            # Define prompt
            template = """You are a chatbot tutoring a student how to write math proofs.
            The student will enter his proof in LaTeX. Return answers in succinct format.
            History: {chat_history}
            Proof Steps: 

            Human: {human_input}
            Chatbot:"""

            # You are a proof assistant helping students with mathematical thinking and understanding.
            # The user will provide you a math statement in LaTeX, and please respond any mathematical notation back in LaTeX.
            prompt = PromptTemplate(
                input_variables=["chat_history", "human_input"], template=template
            )

            messages = map_stored_messages_to_chat_messages(messages)
            history = ChatMessageHistory(messages=messages)
            # Initialize Memory
            memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True, chat_memory=history)
            # Initialize the OpenAI module, load and run the summarize chain
            llm = OpenAI(openai_api_key=openai_api_key)
            llm_chain = LLMChain(llm=llm, prompt=prompt, memory=memory, verbose=True)
            response = llm_chain.predict(human_input=statement)

            # Display summary
            return {"message": response}
        except Exception as e:
            print(e)
            raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/definition")
def defineTerm(term: str):
    docs = vectorstore.similarity_search("linear maps", topn=1)
    firstDoc = docs[0].page_content
    return {"message": firstDoc}
    

@app.get("/api/load-vector-store")
def upload():
    try:
        # print("Loading pdf")
        # loader = DirectoryLoader('./doc/', glob='*.pdf')
        # documents = loader.load()

        # print("uploaded")

        # text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
        # texts = text_splitter.split_documents(documents)
        # # Create embeddings
        # embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)
        # # load it into Chroma
        # global vectorstore
        # vectorstore = Chroma.from_documents(texts, embeddings)

        return {"message": "Uploaded successfully"}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Internal server error")

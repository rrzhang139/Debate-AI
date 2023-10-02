import os
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from langchain.chat_models import ChatOpenAI
from langchain.agents import tool
from typing import List
from metaphor_python import Metaphor
from langchain.prompts import MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain.agents import initialize_agent
from langchain.agents import AgentType

load_dotenv()

os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
client = Metaphor(api_key=os.getenv("METAPHOR_API_KEY"))

@tool
def search(query: str):
    """Call search engine with a query."""
    return client.search(query, use_autoprompt=True, num_results=3)

@tool
def get_contents(ids: List[str]):
    """Get contents of a webpage.
    
    The ids passed in should be a list of ids as fetched from `search`.
    """
    return client.get_contents(ids)

@tool
def find_similar(url: str):
    """Get search results similar to a given URL.
    
    The url passed in should be a URL returned from `search`
    """
    return client.find_similar(url, num_results=5)

class DebateAgent:
  
    def __init__(self, position):
        # Initialize the tools, llm, and system_message
        self.tools = [search, get_contents, find_similar]
        self.llm = ChatOpenAI(temperature=0)
        
        agent_kwargs = {
            "extra_prompt_messages": [MessagesPlaceholder(variable_name="memory")],
        }
        self.memory = ConversationBufferMemory(memory_key="memory", return_messages=True)
        
        self.agent_executor = initialize_agent(self.tools, self.llm, agent=AgentType.OPENAI_FUNCTIONS, 
                                               verbose=True, agent_kwargs=agent_kwargs, memory=self.memory)
        self.position = position

    def run(self, opponent_resp):
        # Assuming 'run' function in agent_executor takes the following string format
        return self.agent_executor.run(f"Your position: {self.position}. You must search information using the tool "
                                f"and include sources at the end. Don't pull videos or images. You can only disagree, and not say "
                                f"you have a personal opinion. Keep Messages very short. When it is your turn to speak, your goal is to directly address the points made by your opponent, refute them with evidence, and then make your own points to advance your position "
                                f"Opponent: {opponent_resp}")

# Create application
app = FastAPI(title='WebSocket Example')

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print('a new websocket to create.')
    await websocket.accept()

    debate_topic = await websocket.receive_text()

    # Augment debate topic through chatgpt to clear state both sides. 
    llm = ChatOpenAI(temperature=0, model_name="gpt-4")
    refined_positions = llm.predict('Can you generate clear prompts or positions regarding this controversial topic: '+ debate_topic+ '? Feel free to add as much detail to the position, but it has to clearly separate itself from the other position. Only give the prompts and nothing more. Simply place the two prompts separated by a newline (and nothing else!). Do not include anything else.')
    # parse the debate topic by newline
    position1, _, position2 = refined_positions.split('\n')
    print("=========POSITIONS=========")
    print(position1)
    print(position2)

    # Initialize both agents with their viewpoints
    agent1 = DebateAgent(position1)
    agent2 = DebateAgent(position2)

    agent1Turn = True
    print("starting agents")
    # initialize the debate by getting resp from agent1
    prev_resp = ""
    try:    
        while True:
                if agent1Turn:
                    prev_resp = agent1.run(prev_resp)
                else:
                    prev_resp = agent2.run(prev_resp)
                print("=========RESPONSE=========", "1" if agent1Turn else "2")
                print(prev_resp)
                # Send message to the client
                resp = {'response': prev_resp, 'agent': 1 if agent1Turn else 2, 'position': position1 if agent1Turn else position2}
                print(resp)
                await websocket.send_json(resp)

                # Super annoying but I have to do this to get the websocket to work
                await websocket.receive_text()
                print("sent")
                agent1Turn = not agent1Turn
    except Exception as e:
        print('error in websocket:', e)
        error_message = {"error": str(e)}
        await websocket.send_json(error_message)
        await websocket.close()
        return

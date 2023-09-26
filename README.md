# Proof Assistant

This project is a proof assistant powered by language models. It allows users to submit proof statements in LaTeX and receive responses in LaTeX notation.

## Installation

To run this project, you can install the required dependencies by running the following command:

`npm install`


## Setup

Before running the application, you need to set up an OpenAI API key. You can obtain an API key from the OpenAI website. Once you have the API key, set it as an environment variable named `OPENAI_API_KEY`.

## Running the Application

To start the application, run the following command:

`npm run dev`



This will start the FastAPI server and make the API endpoints available.

## API Endpoints

- `POST /api/start`: This endpoint is used to start a proof. It expects a JSON payload with a `question` field containing the proof statement in LaTeX format and a `messages` field containing a list of previous chat messages. The response will contain the assistant's reply.

- `POST /api/next`: This endpoint is used to advance to the next step of a proof. It expects a JSON payload with a `question` field containing the current proof statement in LaTeX format and a `messages` field containing a list of previous chat messages. The response will contain the assistant's reply for the next step.

## Additional Resources

- [LangChain Documentation](https://python.langchain.com/docs/get_started/introduction): Official documentation for the LangChain package.

- [OpenAI API Documentation](https://openai.com/docs/): Documentation for the OpenAI API.

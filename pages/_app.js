import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'
import styles from '../styles/Home.module.css'
import ReactMarkdown from 'react-markdown'
import CircularProgress from '@mui/material/CircularProgress';
import '../styles/globals.css'

export default function Home() {
  const [userChatInput, setUserChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      "message": "Input a Controversial Topic to Start",
      "type": "userMessage",
      "position": ""
    }
  ]);
  const [socket, setSocket] = useState(null);

  const messageListRef = useRef(null);
  const textAreaRef = useRef(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    const messageList = messageListRef.current;
    messageList.scrollTop = messageList.scrollHeight;
  }, [chatMessages]);

  // Focus on text field on load
  useEffect(() => {
    textAreaRef.current.focus();
  }, []);

  // Handle errors
  const handleError = (e) => {
    setChatMessages((prevMessages) => [...prevMessages, { "message": "Oops! There seems to be an error. Please try again. " + e, "type": "userMessage", "position": "" }]);
    setLoading(false);
    setUserChatInput("");
  }

  // Handle form submission
  const handleChatSubmit = async(e) => {
    e.preventDefault();

    if (userChatInput.trim() === "") {
      return;
    }

    setLoading(true);
    setChatMessages((prevMessages) => [...prevMessages, { "message": userChatInput, "type": "userMessage", "position": "" }]);


    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    ws.addEventListener('open', () => {
      console.log("Connected to WS server.");
      ws.send(userChatInput);
    });
    ws.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      console.log("GOT DATA", data)
      if(data.error) {
        handleError(data.error);
        return;
      }
      setChatMessages((prevMessages) => [...prevMessages, { "message": data.response, "type": data.agent, "position": data.position }]);
      ws.send("next");
    });
    ws.addEventListener('error', (e) => {
      console.error('WebSocket Error:', e);
      handleError(e);
    });
    ws.addEventListener('close', () => {
      console.log('Disconnected from WS server.')
      setChatMessages((prevMessages) => [...prevMessages, { "message": "Stopped Debate", "type": "userMessage", "position": "" }]);
    });
    setSocket(ws);

    // Reset user input
    setUserChatInput("");
  };

  // Prevent blank submissions and allow for multiline input
  const handleChatEnter = (e) => {
    if (e.key === "Enter" && userChatInput) {
      if(!e.shiftKey && userChatInput) {
        handleChatSubmit(e);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const handleStopClick = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      setLoading(false);
    } else{
      handleError("No socket to close");
    }
  };

  return (
    <>
      <Head>
        <title>Debate AI</title>
        <meta name="description" content="ai debate" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.topnav}>
        <div className = {styles.navlogo}>
          <a href="/">Debate AI</a>
        </div>
      </div>
      <main className={styles.main}>
      <div className = {styles.cloud}>
        <div ref={messageListRef} className = {styles.messagelist}>
        {chatMessages.map((message, index) => {
          return (
            <div key={index} className={
              message.type === "userMessage" && loading && index === chatMessages.length - 1 
              ? styles.usermessagewaiting 
              : message.type !== "userMessage"
              ? (message.type === 1 ? styles.bot1message : styles.bot2message)
              : styles.usermessage
            }>
              {/* Separate div for the icon and title */}
              <div className={styles.iconAndTitle}>
                {message.type !== "userMessage" 
                  ? <strong>🤖 #{message.type}: {message.position}</strong> 
                  : <strong>👤 User</strong>
                }
              </div>
              <div className={styles.markdownanswer}>
                <ReactMarkdown linkTarget={"_blank"}>{message.message}</ReactMarkdown>
              </div>
            </div>
          )
        })}
        </div>
            </div>
           <div className={styles.center}>
            <div className = {styles.cloudform}>
           <form onSubmit = {handleChatSubmit}>
          <textarea 
          disabled = {loading}
          onKeyDown={handleChatEnter}
          ref = {textAreaRef}
          autoFocus = {false}
          rows = {1}
          maxLength = {512}
          type="text" 
          id="userChatInput" 
          name="userChatInput" 
          placeholder = {loading? "Waiting for response..." : "Type your question..."}  
          value = {userChatInput} 
          onChange = {e => setUserChatInput(e.target.value)} 
          className = {styles.textarea}
          />
            <button 
            type = "submit" 
            disabled = {loading}
            className = {styles.generatebutton}
            >
            {loading ? <div className = {styles.loadingwheel}><CircularProgress color="inherit" size = {20}/> </div> : 
            // Send icon SVG in input field
            <svg viewBox='0 0 20 20' className={styles.svgicon} xmlns='http://www.w3.org/2000/svg'>
            <path d='M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z'></path>
          </svg>}
            </button>
            </form>
            </div>
            <button onClick={handleStopClick}>Stop</button>
        </div>
        </main>
        </>
  );

  {/* return (
    <div>
      <h1>WebSocket Example</h1>
      <button onClick={startSocket}>Start</button>
      <button onClick={resetSocket}>Reset</button>
      <p>Response from WebSocket: {value}</p>
      <p>Agent: {agent}</p>
    </div>
  ); */}
}

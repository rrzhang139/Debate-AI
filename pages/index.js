import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../api'
import axios from 'axios';
import { useState, useRef, useEffect } from 'react'
import styles from '../styles/Home.module.css'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import CircularProgress from '@mui/material/CircularProgress';

export default function Home() {

  const [userChatInput, setUserChatInput] = useState("");
  // const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadPDF, setUploadPDF] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      "message": "Hi there! How can I help?",
      "type": "apiMessage"
    }
  ]);
  const [userProofInput, setUserProofInput] = useState("");
  const [proofMessages, setProofMessages] = useState([
    {
      "message": "Hi there! Start with a statement we can prove. For example, \"Prove that 2 + 2 = 4\".",
      "type": "apiMessage"
    }
  ]);
  // const [proofHistory, setProofHistory] = useState([]);

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
  const handleError = () => {
    setChatMessages((prevMessages) => [...prevMessages, { "message": "Oops! There seems to be an error. Please try again.", "type": "apiMessage" }]);
    setProofMessages((prevMessages) => [...prevMessages, { "message": "Oops! There seems to be an error. Please try again.", "type": "apiMessage" }]);
    setLoading(false);
    setUserChatInput("");
    setUserProofInput("");
  }

  // Handle form submission
  const handleChatSubmit = async(e) => {
    e.preventDefault();

    if (userChatInput.trim() === "") {
      return;
    }

    setLoading(true);
    setChatMessages((prevMessages) => [...prevMessages, { "message": userChatInput, "type": "userMessage" }]);

    // Send user question and history to API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: userChatInput, messages: chatMessages, proofMessages: proofMessages }),
    });

    if (!response.ok) {
      handleError();
      return;
    }

    // Reset user input
    setUserChatInput("");
    const data = await response.json();

    setChatMessages((prevMessages) => [...prevMessages, { "message": data.message, "type": "apiMessage" }]);
    setLoading(false);
  };

  const handleProofSubmit = async(e) => {
    e.preventDefault();

    if (userProofInput.trim() === "") {
      return;
    }

    setLoading(true);
    setUserProofInput((prevMessages) => [...prevMessages, { "message": userProofInput, "type": "userMessage" }]);

    // Send user proof step and history to API
    const response = await fetch("/api/proof-step", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: userProofInput, messages: proofMessages }),
    });

    if (!response.ok) {
      handleError();
      return;
    }

    // Reset user input
    setUserProofInput("");
    const data = await response.json();

    setProofMessages((prevMessages) => [...prevMessages, { "message": data.message, "type": "apiMessage" }]);
    setLoading(false);
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

  const handleProofEnter = (e) => {
    if (e.key === "Enter" && userProofInput) {
      if(!e.shiftKey && userProofInput) {
        handleProofSubmit(e);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  // Upload PDF
  const handleUpload = async () => {
    try {
      console.log("calling handle upload")
      await axios.get('/api/load-vector-store');
      setUploadPDF("Uploaded")
    } catch (error) {
      console.error('Error uploading:', error);
    }
  }

  // Keep history in sync with messages
  // useEffect(() => {
  //   if (messages.length >= 3) {
  //     setHistory([[messages[messages.length - 2].message, messages[messages.length - 1].message]]);
  //   }
  //   }, [messages])

  return (
    <>
      <Head>
        <title>Proof Assistant (Chat)</title>
        <meta name="description" content="proof assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.topnav}>
        <div className = {styles.navlogo}>
          <a href="/">Proof Assistant (Chat)</a>
        </div>
      </div>
      <main className={styles.main}>
      <div className = {styles.cloud}>
        <div ref={messageListRef} className = {styles.messagelist}>
        {chatMessages.map((message, index) => {
          return (
            // The latest message sent by the user will be animated while waiting for a response
              <div key = {index} className = {message.type === "userMessage" && loading && index === chatMessages.length - 1  ? styles.usermessagewaiting : message.type === "apiMessage" ? styles.apimessage : styles.usermessage}>
                {/* Display the correct icon depending on the message type */}
                {message.type === "apiMessage" ? <Image src = "/parroticon.png" alt = "AI" width = "30" height = "30" className = {styles.boticon} priority = {true} /> : <Image src = "/usericon.png" alt = "Me" width = "30" height = "30" className = {styles.usericon} priority = {true} />}
              <div className = {styles.markdownanswer}>
                {/* Messages are being rendered in Markdown format */}
                <ReactMarkdown linkTarget = {"_blank"}>{message.message}</ReactMarkdown>
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
            <button onClick={handleUpload} className="bg-blue-700 text-white px-4 py-2 rounded-md">
              Load PDF
            </button>
            <div className = {styles.footer}>
              <p>{uploadPDF}</p>
            </div>
        </div>
        {/* Proof */}
        <div className={styles.topnav}>
        <div className = {styles.navlogo}>
          <a href="/">Proof Assistant (Proof)</a>
          </div>
        </div>
        <div className = {styles.cloud}>
        <div ref={messageListRef} className = {styles.messagelist}>
        {proofMessages.map((message, index) => {
          return (
            // The latest message sent by the user will be animated while waiting for a response
              <div key = {index} className = {message.type === "userMessage" && loading && index === proofMessages.length - 1  ? styles.usermessagewaiting : message.type === "apiMessage" ? styles.apimessage : styles.usermessage}>
                {/* Display the correct icon depending on the message type */}
                {message.type === "apiMessage" ? <Image src = "/parroticon.png" alt = "AI" width = "30" height = "30" className = {styles.boticon} priority = {true} /> : <Image src = "/usericon.png" alt = "Me" width = "30" height = "30" className = {styles.usericon} priority = {true} />}
              <div className = {styles.markdownanswer}>
                {/* Messages are being rendered in Markdown format */}
                <ReactMarkdown linkTarget = {"_blank"}>{message.message}</ReactMarkdown>
                </div>
              </div>
          )
        })}
        </div>
            </div>
           <div className={styles.center}>
            <div className = {styles.cloudform}>
           <form onSubmit = {handleProofSubmit}>
          <textarea 
          disabled = {loading}
          onKeyDown={handleProofEnter}
          ref = {textAreaRef}
          autoFocus = {false}
          rows = {1}
          maxLength = {512}
          type="text" 
          id="userProofInput" 
          name="userProofInput" 
          placeholder = {loading? "Waiting for response..." : "Type your proof step (in LaTeX for math notation)..."}  
          value = {userProofInput} 
          onChange = {e => setUserProofInput(e.target.value)} 
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
        </div>
      </main>
    </>
  )
}
import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './ChatWindow.css';

const ChatWindow = () => {
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const messagesEndRef = useRef(null);
    const textAreaRef = useRef(null);
    const inputRef = useRef(null);  // Add new ref for the textarea
    const initialMessageSent = useRef(false);  // Add this to track if initial message was sent

    // Get the ID from the URL path
    const id = window.location.pathname.substring(1);

    // Effect to automatically send initial message when component mounts
    useEffect(() => {
        if (id && !initialMessageSent.current) {
            handleSendWithMessage("");
            initialMessageSent.current = true;  // Mark as sent
        }
    }, [id]);  // Only depend on id changes

    // Add new useEffect for focusing the textarea
    useEffect(() => {
        //inputRef.current?.focus();
    }, []); // Empty dependency array means this runs once on mount

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendWithMessage = async (messageText) => {
        // Don't add empty messages to the array
        if (messageText.trim() === '') {
            try {
                const response = await fetch(`${API_BASE_URL}/api/web/${id}`, {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify([])
                });

                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }

                const botResponse = await response.text();
                const decodedResponse = JSON.parse(`"${botResponse.replace(/^"|"$/g, '').replace(/"/g, '\\"')}"`);

                // Add only the bot response if it's the first message
                if (messages.length === 0) {
                    setMessages([{ text: decodedResponse, isUser: false }]);
                }
            } catch (error) {
                console.error('Error:', error);
            }
            return;
        }

        // Handle non-empty messages as before
        let newMessages = [...messages];
        if (newMessages.length >= 7) {  // Changed from 3 to 7 for display
            newMessages = newMessages.slice(-6);  // Keep last 6 messages when adding a new one
        }
        newMessages.push({ text: messageText, isUser: true });
        setMessages(newMessages);

        try {
            // Get only the last 3 messages for the API call
            const lastThreeMessages = newMessages.slice(-3);
            // Create array of messages in reverse order with empty string padding
            const messageTexts = lastThreeMessages.map(m => m.text).reverse();
            while (messageTexts.length < 3) {
                messageTexts.push('');
            }

            const response = await fetch(`${API_BASE_URL}/api/web/${id}`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageTexts)
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }

            const botResponse = await response.text();
            const decodedResponse = JSON.parse(`"${botResponse.replace(/^"|"$/g, '').replace(/"/g, '\\"')}"`);

            let updatedMessages = [...newMessages];
            if (updatedMessages.length >= 7) {  // Changed from 3 to 7
                updatedMessages = updatedMessages.slice(-6);  // Keep last 6 when adding bot response
            }
            updatedMessages.push({ text: decodedResponse, isUser: false });
            setMessages(updatedMessages);
        } catch (error) {
            console.error('Error:', error);
            // Remove the last message and don't add error message
            setMessages(newMessages.slice(0, -1));
        }
    };

    const handleSend = async () => {
        if (currentMessage.trim() === '') return;
        const messageToSend = currentMessage;
        setCurrentMessage(''); // Clear immediately
        await handleSendWithMessage(messageToSend);
    };

    //const handleKeyPress = (e) => {
    //    if (e.key === 'Enter' && !e.shiftKey) {
    //        e.preventDefault();
    //        const messageToSend = currentMessage; // Store the current message
    //        setCurrentMessage(''); // Clear immediately
    //        handleSendWithMessage(messageToSend); // Send the stored message
    //    }
    //};

    const adjustTextAreaHeight = () => {
        const textarea = textAreaRef.current;
        textarea.style.height = 'auto';
        //textarea.style.height = `${textarea.scrollHeight}px`;
    };

    // Add this new function to parse and format links
    const formatMessage = (text) => {
        // Phone Numbers:
        const phoneNumberRegex = /(\+\d{1,3}\s?)?((\(\d{1,4}\))|\d{1,4})[-.\s]?\d{3}[-.\s]?\d{4}/g;
            text = text.replace(phoneNumberRegex, (phoneNumber) => {
                return `<a href="tel:${phoneNumber}" style="color: inherit; text-decoration: underline">${phoneNumber}</a>`;
            });
        // Process different markdown elements in specific order
        const processMarkdown = (text) => {
            // Links: [text](url)
            text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
                `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline">${text}</a>`
            );

            // Bold: **text** or __text__
            text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

            // Italic: *text* or _text_
            text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

            // Bullet lists: - text or * text
            text = text.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
            text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

            // Line breaks: Convert \n to <br>
            text = text.replace(/\n/g, '<br>');

            return text;
        };

        // Process the markdown and convert to React elements
        const createMarkup = () => {
            return { __html: processMarkdown(text) };
        };

        return <div dangerouslySetInnerHTML={createMarkup()} />;
    };

    return (
        <div className="chat-container">
            <div className="messages-container">
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.isUser ? 'user' : 'bot'}`}>
                        <div className="message-content">
                            {formatMessage(message.text)}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-container">
                <textarea
                    ref={(el) => {
                        textAreaRef.current = el;  // Keep existing ref
                        inputRef.current = el;     // Add new ref
                    }}
                    value={currentMessage}
                    onChange={(e) => {
                        setCurrentMessage(e.target.value);
                        adjustTextAreaHeight();
                    }}
                    //onKeyPress={handleKeyPress}
                    //placeholder="Type a message..."
                    rows={1}
                    //maxRows={7}
                    style={{ maxHeight: '168px' }}
                    autoFocus  // Add autoFocus prop
                />
                 <button 
                    onClick={handleSend} 
                    className="send-button"
                    disabled={currentMessage.trim() === ''}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="send-icon">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ChatWindow; 

/*
// Email Addresses:
const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
text = text.replace(emailRegex, (email) => {
    return `<a href="mailto:${email}" style="color: inherit; text-decoration: underline">${email}</a>`;
});

// Dates:
const dateRegex = /(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})/g;
text = text.replace(dateRegex, (date) => {
    return `<time datetime="${date}">${date}</time>`;
});

// Times:
const timeRegex = /(\d{1,2}:\d{2}([ap]m)?)/g;
text = text.replace(timeRegex, (time) => {
    return `<time>${time}</time>`;
});

// Currency:
const currencyRegex = /\$\d+(\.\d{2})?/g;
text = text.replace(currencyRegex, (currency) => {
    return `<span>${currency}</span>`;
});

// Numbers:
const numberRegex = /\b\d+\b/g;
text = text.replace(numberRegex, (number) => {
    return `<span>${number}</span>`;
});
// Add this new function to parse and format links
const formatMessage = (text) => {
    // Process different markdown elements in specific order
    const processMarkdown = (text) => {
        // Links: [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
            `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline">${text}</a>`
        );

        // Bold: **text** or __text__
        text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

        // Italic: *text* or _text_
        text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

        // Bullet lists: - text or * text
        text = text.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Line breaks: Convert \n to <br>
        text = text.replace(/\n/g, '<br>');

        return text;
    };

    // Process the markdown and convert to React elements
    const createMarkup = () => {
        return { __html: processMarkdown(text) };
    };

    return <div dangerouslySetInnerHTML={createMarkup()} />;
};
*/
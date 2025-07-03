import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Main App component
function App() {
  // Firebase state
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);

  // Note management state
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null); // For manual editing of existing notes
  const [selectedNoteForChat, setSelectedNoteForChat] = useState(null); // New state for active chat note

  // AI interaction state (for general commands/notes)
  const [userInput, setUserInput] = useState(''); // Combined input for notes and AI commands
  const [loadingAi, setLoadingAi] = useState(false); // Controls AI button spinner and disables input
  const [simulatedThinkingSteps, setSimulatedThinkingSteps] = useState([]); // For visual workflow
  const [currentSimulatedStepIndex, setCurrentSimulatedStepIndex] = useState(0);

  // Modal state for user messages/confirmations
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalOnConfirm, setModalOnConfirm] = useState(null);
  const [showModalConfirmButton, setShowModalConfirmButton] = useState(false);
  const [aiError, setAiError] = useState(''); // Specific error for AI calls

  // State for custom prompts
  const [customPrompts, setCustomPrompts] = useState([]);
  const [showSavePromptModal, setShowSavePromptModal] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');

  // States for Video Simulation (integrated)
  const [aiAssistantAvatar, setAiAssistantAvatar] = useState('https://placehold.co/150x150/6b46c1/ffffff?text=Your+AI'); // Avatar for the main AI Assistant
  const [videoScriptResponse, setVideoScriptResponse] = useState(''); // AI's response for the video script
  const [loadingVideo, setLoadingVideo] = useState(false);
  // Using a GIF URL to simulate a talking head video
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0); // For simulated loading bar

  // New state for image upload to main textbox
  const [uploadedImage, setUploadedImage] = useState(null); // Stores { data: base64, mimeType: string }
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null); // Stores URL.createObjectURL for display

  // Refs for file inputs
  const avatarFileInputRef = useRef(null); // For AI Assistant avatar upload
  const mainImageInputRef = useRef(null); // For image upload to main prompt box

  // Define simulated thinking steps for the agentic workflow
  const agenticWorkflowSteps = [
    "Understanding your request...",
    "Analyzing current notes context...",
    "Determining optimal action (add/update/advise)...",
    "Consulting relevant knowledge bases (simulated)...",
    "Synthesizing information and formulating response...",
    "Executing suggested actions (if any)...",
    "Generating Key Findings Report..."
  ];

  // Business Prompt Library (Hardcoded for demonstration)
  const businessPromptLibrary = [
    {
      category: "Marketing",
      prompts: [
        { title: "Generate Social Media Post", content: "Draft a compelling social media post for a new product launch, highlighting its key benefits and a call to action. Target audience: [Audience], Product: [Product Name], Benefits: [List Benefits], CTA: [Call to Action]." },
        { title: "Email Campaign Outline", content: "Create an outline for a 3-part email marketing campaign to re-engage dormant customers. Include subject lines, main points for each email, and a final CTA." },
        { title: "Blog Post Idea Generation", content: "Brainstorm 5 unique blog post ideas about [Topic], focusing on SEO keywords and audience engagement. Include a brief description for each idea." },
      ]
    },
    {
      category: "Project Management",
      prompts: [
        { title: "Project Plan Outline", content: "Outline a project plan for [Project Name], including phases, key milestones, required resources, and potential risks. Deadline: [Date]." },
        { title: "Meeting Agenda Draft", content: "Draft a meeting agenda for a [Type of Meeting] with the objective of [Objective]. Include discussion topics, decision points, and action items." },
        { title: "Risk Assessment Template", content: "Provide a template for a basic project risk assessment, including categories for risk identification, impact, likelihood, and mitigation strategies." },
      ]
    },
    {
      category: "Customer Service",
      prompts: [
        { title: "Customer Complaint Response", content: "Draft a polite and effective response to a customer complaint about [Issue]. Aim to acknowledge the issue, apologize, and offer a solution or next steps." },
        { title: "FAQ Section Content", content: "Generate content for an FAQ section covering common questions about [Product/Service]. Include at least 5 questions and concise answers." },
        { title: "Troubleshooting Guide Outline", content: "Create an outline for a troubleshooting guide for [Problem]. Include common symptoms, diagnostic steps, and solutions." },
      ]
    },
    {
      category: "General Business",
      prompts: [
        { title: "SWOT Analysis Template", content: "Provide a template for a SWOT analysis for [Company/Product/Project]. Explain what to include in each section (Strengths, Weaknesses, Opportunities, Threats)." },
        { title: "Business Idea Brainstorm", content: "Brainstorm 3 innovative business ideas within the [Industry] sector, considering current market trends and potential customer needs. For each, include a brief concept and target audience." },
      ]
    }
  ];

  // Helper to show modal messages, now with optional confirmation
  const showUserMessage = useCallback((message, title = "Notification", onConfirm = null) => {
    setModalMessage(message);
    setModalTitle(title);
    setShowModal(true);
    setModalOnConfirm(() => onConfirm); // Store the onConfirm callback if provided
    setShowModalConfirmButton(!!onConfirm); // Show confirm button if onConfirm is provided
  }, []);

  // Initialize Firebase and set up authentication
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // Sign in with custom token or anonymously
      const signIn = async () => {
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }
      };
      signIn();

      // Listen for auth state changes
      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(null); // User is signed out
        }
      });

      return () => unsubscribeAuth();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      showUserMessage("Error initializing app. Please try again.", "Error");
    }
  }, [showUserMessage]); // Include showUserMessage in dependencies

  // Fetch notes when userId and db are available
  useEffect(() => {
    if (db && userId) {
      const notesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/notes`);
      // Order by timestamp to show most recent notes first
      const q = query(notesCollectionRef, orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotes(notesData);
        // If the currently selected note for chat was updated, refresh its state
        if (selectedNoteForChat) {
          const updatedSelectedNote = notesData.find(n => n.id === selectedNoteForChat.id);
          if (updatedSelectedNote) {
            setSelectedNoteForChat(updatedSelectedNote);
          }
        }
      }, (error) => {
        console.error("Error fetching notes:", error);
        showUserMessage("Error fetching notes. Please refresh the page.", "Error");
      });

      return () => unsubscribe();
    }
  }, [db, userId, appId, showUserMessage, selectedNoteForChat]); // Add selectedNoteForChat to dependencies

  // Fetch custom prompts when userId and db are available
  useEffect(() => {
    if (db && userId) {
      const customPromptsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customPrompts`);
      const q = query(customPromptsCollectionRef, orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const promptsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCustomPrompts(promptsData);
      }, (error) => {
        console.error("Error fetching custom prompts:", error);
        showUserMessage("Error fetching custom prompts. Please refresh the page.", "Error");
      });

      return () => unsubscribe();
    }
  }, [db, userId, appId, showUserMessage]);

  // Add a new note (used by AI suggestions and potentially direct user input)
  const addNote = async (title, content, chatHistory = []) => {
    if (!db || !userId) {
      console.error("Database not ready. Cannot add note.");
      return;
    }
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notes`), {
        title: title,
        content: content,
        timestamp: serverTimestamp(),
        status: 'todo',
        chatHistory: chatHistory // Initialize chat history for new notes
      });
      // console.log("Note added successfully by AI:", title); // Log for debugging
    } catch (e) {
      console.error("Error adding document: ", e);
      showUserMessage("Failed to add note. Please try again.", "Error");
    }
  };

  // Set note for manual editing (via the 'Edit' button on notes)
  const startEditing = (note) => {
    setSelectedNoteForChat(null); // Exit chat mode if active
    setEditingNote(note);
    setUserInput(note.content); // Pre-fill the main input with content for editing
    showUserMessage(`Editing note: "${note.title}". Modify the text below and click 'Update Note'.`, "Edit Note");
  };

  // Update an existing note (used for manual edits)
  const handleUpdateNote = async () => {
    if (!editingNote || !userInput.trim()) {
      showUserMessage("Note content cannot be empty for update.", "Input Error");
      return;
    }
    if (!db || !userId) {
      showUserMessage("Database not ready. Please wait.", "Error");
      return;
    }

    try {
      const noteRef = doc(db, `artifacts/${appId}/users/${userId}/notes`, editingNote.id);
      await updateDoc(noteRef, {
        content: userInput, // Update with the new user input
        timestamp: serverTimestamp() // Update timestamp on edit
      });
      setEditingNote(null);
      setUserInput('');
      showUserMessage("Note updated successfully!", "Success");
    } catch (e) {
      console.error("Error updating document: ", e);
      showUserMessage("Failed to update note. Please try again.", "Error");
    }
  };

  // Delete a note
  const handleDeleteNote = async (id) => {
    if (!db || !userId) {
      showUserMessage("Database not ready. Please wait.", "Error");
      return;
    }
    showUserMessage(
      "Are you sure you want to delete this note?",
      "Confirm Deletion",
      async () => {
        try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/notes`, id));
          if (selectedNoteForChat && selectedNoteForChat.id === id) {
            setSelectedNoteForChat(null); // Deselect if the deleted note was being chatted with
          }
          showUserMessage("Note deleted successfully!", "Success");
        } catch (e) {
          console.error("Error deleting document: ", e);
          showUserMessage("Failed to delete note. Please try again.", "Error");
        }
      }
    );
  };

  // Mark a note as completed/uncompleted
  const toggleNoteStatus = async (note) => {
    if (!db || !userId) {
      showUserMessage("Database not ready. Please wait.", "Error");
      return;
    }
    try {
      const noteRef = doc(db, `artifacts/${appId}/users/${userId}/notes`, note.id);
      const newStatus = note.status === 'completed' ? 'todo' : 'completed';
      await updateDoc(noteRef, { status: newStatus });
      showUserMessage(`Note marked as ${newStatus}!`, "Status Update");
    } catch (e) {
      console.error("Error updating note status: ", e);
      showUserMessage("Failed to update note status. Please try again.", "Error");
    }
  };

  // Function to simulate the AI agent's thinking process (visual only)
  const simulateThinkingProcess = () => {
    setSimulatedThinkingSteps(agenticWorkflowSteps);
    let stepCounter = 0;
    const interval = setInterval(() => {
      stepCounter++;
      setCurrentSimulatedStepIndex(stepCounter);
      if (stepCounter >= agenticWorkflowSteps.length) {
        clearInterval(interval);
      }
    }, 800); // Adjust speed of thinking steps
    return interval;
  };

  // Call Gemini API for AI generation (core API caller)
  const callGeminiAPI = async (chatHistoryForApi) => {
    setAiError(''); // Clear previous AI error
    try {
      const payload = { contents: chatHistoryForApi };
      const apiKey = ""; // Canvas will provide this in runtime

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${errorData.error.message}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        return text; // Return the generated text for further processing
      } else {
        throw new Error("Unexpected API response structure or no content.");
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setAiError(`AI Assistant Error: ${error.message}`);
      return null;
    }
  };

  // Helper function to update a note based on AI suggestion (appends content)
  const updateNoteFromAI = async (noteId, newContent) => {
    if (!db || !userId) {
      console.error("Database not ready. Cannot update AI suggested note.");
      return;
    }
    try {
      const noteRef = doc(db, `artifacts/${appId}/users/${userId}/notes`, noteId);
      const existingNote = notes.find(n => n.id === noteId);
      if (existingNote) {
        await updateDoc(noteRef, {
          content: existingNote.content + "\n\n" + newContent, // Append new content
          timestamp: serverTimestamp()
        });
        // console.log("Note updated successfully by AI:", noteId); // Log for debugging
      } else {
        console.warn("Could not find the note to update based on AI suggestion:", noteId);
        // No modal here, let the main AI response cover this.
      }
    } catch (e) {
      console.error("Error updating AI suggested note:", e);
      showUserMessage("Failed to update AI suggested note. Please try manually.", "Error");
    }
  };

  // Handle user input as a command to the AI consultant agent (general or within chat)
  const handleUserCommand = async (upgradePrompt = false) => {
    if (!userInput.trim() && !uploadedImage) {
      showUserMessage("Please enter your note or command, or upload an image.", "Input Error");
      return;
    }

    setLoadingAi(true); // Start loading for the button spinner
    setAiError(''); // Clear previous AI error
    const intervalId = simulateThinkingProcess(); // Start simulating thinking process

    let currentChatHistory = [];
    let noteToUpdateAfterChat = null; // To store the note object if we're in chat mode

    // Construct the parts array for multimodal input
    let userParts = [];
    let currentInput = userInput;

    // Check for video generation request
    const isVideoRequest = currentInput.toLowerCase().includes('generate video') ||
                           currentInput.toLowerCase().includes('create a video') ||
                           currentInput.toLowerCase().includes('make an ad campaign video');

    if (upgradePrompt) {
      currentInput = `Instantly upgrade this prompt for professional use: "${currentInput}"`;
    }

    if (currentInput.trim()) {
      userParts.push({ text: currentInput });
    }
    if (uploadedImage) {
      userParts.push({
        inlineData: {
          mimeType: uploadedImage.mimeType,
          data: uploadedImage.data
        }
      });
    }

    if (selectedNoteForChat) {
      // If we are in chat mode for a specific note
      noteToUpdateAfterChat = selectedNoteForChat;
      // Use the existing chat history of the selected note
      currentChatHistory = [...selectedNoteForChat.chatHistory || []];
      // Add the current user input (and image) to the chat history
      currentChatHistory.push({ role: "user", parts: userParts });
    } else {
      // If it's a general command/new note request
      const currentNotesContext = notes.map(note => `Title: ${note.title}\nContent: ${note.content}\nStatus: ${note.status}\nID: ${note.id}`).join('\n---\n');

      let systemPrompt = `You are an AI Consultant Agent for a note-taking application. Your goal is to help the user manage their notes, plan tasks, and track successes. You are powered by the latest and top-performing AI generation models.
You should act as a single, intelligent agent capable of understanding user intent and suggesting actions or providing guidance.

Here are the user's current notes:
${currentNotesContext || "No notes available yet."}

User's input/command: "${currentInput}"

`;

      if (isVideoRequest) {
        systemPrompt += `Based on the user's input, provide a concise and engaging script suitable for a marketing video or ad campaign. Start your response with "VIDEO_SCRIPT:".`;
      } else {
        systemPrompt += `Based on the user's input, perform one of the following actions or provide a helpful response. If you suggest an action, use the specific format below. The application will automatically execute these actions.

1.  **Suggest a New Note:** If the user wants to add a new task, idea, or record something, suggest a new note. Infer a concise title from the content.
    Format: "ACTION: ADD_NOTE | TITLE: [Suggested Title] | CONTENT: [Suggested Content]"
2.  **Suggest an Update to an Existing Note:** If the user wants to modify an existing note (e.g., add details, update status implicitly), suggest an update. Identify the note by its title or ID and provide the new content to append.
    Format: "ACTION: UPDATE_NOTE | ID: [Note ID or Title] | NEW_CONTENT: [Updated/Appended Content]"
3.  **Provide a Plan/Guidance:** If the user asks for planning, next steps, or general advice related to their notes or goals, provide a concise, actionable plan or advice.
4.  **Acknowledge Success:** If the user reports a success or completion, acknowledge it and suggest marking the relevant note as 'completed' if applicable.
5.  **Help Build Prompt:** If the user asks for help in building a prompt, provide examples or guide them on how to structure an effective prompt for a specific task.

After any suggested action (or if no action is suggested), always provide a "Key Findings Report" based on the current notes and the user's input. This report should summarize key insights, potential next steps, or connections found within the notes relevant to the user's query. If the user's input relates to workflow optimization, also include "Workflow/Automation Suggestions" (conceptual RPA/AIIW steps) and "Recommended Tools" that could help.

The entire response, including any ACTION line and the Key Findings Report, should be a single, coherent dialogue.

Example of a full response:
ACTION: ADD_NOTE | TITLE: [Suggested Title] | CONTENT: [Suggested Content]
---
Key Findings Report:
- Finding 1: [Summary of a key insight]
- Finding 2: [Another key insight]
- Next Steps: [Actionable items derived from findings]
- Workflow/Automation Suggestions: [Conceptual RPA/AIIW steps]
- Recommended Tools (if applicable): [List of tools with brief descriptions]
---
`;
      }

      currentChatHistory.push({
        role: "user",
        parts: [{ text: systemPrompt }]
      });
      // Add user's actual input parts (text and image) after the system prompt
      currentChatHistory[0].parts.push(...userParts);
    }

    setUserInput(''); // Clear input after sending to AI
    setUploadedImage(null); // Clear image after sending to AI
    setUploadedImagePreview(null);

    try {
      const aiGeneratedText = await callGeminiAPI(currentChatHistory);

      if (aiGeneratedText) {
        // Add AI's response to the chat history
        const aiMessage = { role: "model", parts: [{ text: aiGeneratedText }] };
        currentChatHistory.push(aiMessage);

        if (noteToUpdateAfterChat) {
          // If in chat mode, update the selected note's chat history in Firestore
          const noteRef = doc(db, `artifacts/${appId}/users/${userId}/notes`, noteToUpdateAfterChat.id);
          await updateDoc(noteRef, {
            chatHistory: currentChatHistory,
            timestamp: serverTimestamp() // Update timestamp on chat interaction
          });
        } else {
          // If not in chat mode, process potential actions and display AI response as before
          if (aiGeneratedText.startsWith("VIDEO_SCRIPT:")) {
            const script = aiGeneratedText.substring("VIDEO_SCRIPT:".length).trim();
            setVideoScriptResponse(script); // Set the script for video generation
            handleGenerateVideoFromCloneResponse(); // Trigger simulated video generation
          } else if (aiGeneratedText.startsWith("ACTION: ADD_NOTE")) {
            const titleMatch = aiGeneratedText.match(/TITLE: (.*?)\s*\|/);
            const contentMatch = aiGeneratedText.match(/CONTENT: (.*)/s); // Use 's' flag for dotall
            const suggestedTitle = titleMatch ? titleMatch[1].trim() : 'AI Suggested Note';
            const suggestedContent = contentMatch ? contentMatch[1].trim() : 'AI suggested content.';
            // For new notes from general command, initialize its chat history with this interaction
            await addNote(suggestedTitle, suggestedContent, currentChatHistory);
          } else if (aiGeneratedText.startsWith("ACTION: UPDATE_NOTE")) {
            const idMatch = aiGeneratedText.match(/ID: (.*?)\s*\|/);
            const contentMatch = aiGeneratedText.match(/NEW_CONTENT: (.*)/s); // Use 's' flag for dotall
            const suggestedIdOrTitle = idMatch ? idMatch[1].trim() : '';
            const suggestedNewContent = contentMatch ? contentMatch[1].trim() : '';

            const noteToUpdate = notes.find(n => n.id === suggestedIdOrTitle) || notes.find(n => n.title === suggestedIdOrTitle);

            if (noteToUpdate) {
              await updateNoteFromAI(noteToUpdate.id, suggestedNewContent);
            } else {
              console.warn(`AI suggested an update for a note not found: ${suggestedIdOrTitle}`);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in handleUserCommand:", error);
      // aiError is already handled by callGeminiAPI
    } finally {
      clearInterval(intervalId); // Stop simulating thinking
      setLoadingAi(false);
      setSimulatedThinkingSteps([]); // Clear thinking steps
      setCurrentSimulatedStepIndex(0);
    }
  };

  // Function to load a prompt from the library into the input field
  const loadPromptToInput = (promptContent) => {
    setUserInput(promptContent);
    setSelectedNoteForChat(null); // Ensure we're not in note chat mode when loading a general prompt
    setUploadedImage(null); // Clear any uploaded image when loading a text prompt
    setUploadedImagePreview(null);
  };

  // Function to save a custom prompt
  const saveCustomPrompt = async () => {
    if (!newPromptTitle.trim() || !userInput.trim()) {
      showUserMessage("Prompt title and content cannot be empty.", "Input Error");
      return;
    }
    if (!db || !userId) {
      showUserMessage("Database not ready. Please wait.", "Error");
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/customPrompts`), {
        title: newPromptTitle.trim(),
        content: userInput.trim(),
        timestamp: serverTimestamp()
      });
      showUserMessage("Custom prompt saved successfully!", "Success");
      setShowSavePromptModal(false);
      setNewPromptTitle('');
      setUserInput(''); // Clear input after saving
      setUploadedImage(null); // Clear image after saving prompt
      setUploadedImagePreview(null);
    } catch (e) {
      console.error("Error saving custom prompt:", e);
      showUserMessage("Failed to save custom prompt. Please try again.", "Error");
    }
  };

  // Function to delete a custom prompt
  const deleteCustomPrompt = async (id) => {
    if (!db || !userId) {
      showUserMessage("Database not ready. Please wait.", "Error");
      return;
    }
    showUserMessage(
      "Are you sure you want to delete this custom prompt?",
      "Confirm Deletion",
      async () => {
        try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/customPrompts`, id));
          showUserMessage("Custom prompt deleted successfully!", "Success");
        } catch (e) {
          console.error("Error deleting custom prompt:", e);
          showUserMessage("Failed to delete custom prompt. Please try again.", "Error");
        }
      }
    );
  };

  // Handle file selection for AI Assistant avatar image
  const handleAvatarFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(file);
        setAiAssistantAvatar(imageUrl);
        showUserMessage("Avatar uploaded! Your AI Assistant's appearance has been updated. (In a real app, this would involve complex AI processing on a backend.)", "AI Avatar Updated");
      } else if (file.type === 'application/pdf') {
        showUserMessage("PDF file uploaded. For a real AI, this would be processed on a backend to extract relevant information or generate an avatar. Visual rendering of PDF as an avatar is not supported in this demo.", "PDF Uploaded (Simulated)");
        setAiAssistantAvatar('https://placehold.co/150x150/6b46c1/ffffff?text=PDF+Uploaded'); // Indicate PDF
      } else {
        showUserMessage("Unsupported file type. Please upload an image (JPEG, PNG, GIF) or a PDF.", "Unsupported File");
      }
    }
  };

  // Trigger the hidden file input click for AI Assistant avatar image
  const triggerAvatarFileInput = () => {
    avatarFileInputRef.current.click();
  };

  // Handle file selection for main textbox image
  const handleMainImageFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showUserMessage("Unsupported file type. Please upload an image (JPEG, PNG, GIF).", "Unsupported File");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the data URI prefix (e.g., "data:image/png;base64,")
        const base64String = reader.result.split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        setUploadedImagePreview(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger the hidden file input click for main textbox image
  const triggerMainImageInput = () => {
    mainImageInputRef.current.click();
  };

  const clearMainImage = () => {
    setUploadedImage(null);
    setUploadedImagePreview(null);
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = ''; // Clear the file input value
    }
  };

  // Simulate video generation using the AI-generated script
  const handleGenerateVideoFromCloneResponse = async () => {
    if (!videoScriptResponse.trim()) {
      showUserMessage("No script available from AI to generate video.", "No Script");
      return;
    }
    setLoadingVideo(true);
    setGeneratedVideoUrl('');
    setVideoGenerationProgress(0); // Reset progress
    setAiError('');

    showUserMessage("Video generation initiated! This process involves complex AI models and will take approximately 15 seconds.", "Video Generation");

    const totalDuration = 15000; // 15 seconds
    const intervalTime = 500; // Update every 0.5 seconds
    let currentProgress = 0;

    const progressInterval = setInterval(() => {
      currentProgress += (intervalTime / totalDuration) * 100;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressInterval);
      }
      setVideoGenerationProgress(Math.floor(currentProgress));
    }, intervalTime);

    // Simulate network delay for video generation
    setTimeout(() => {
      clearInterval(progressInterval); // Ensure interval is cleared if timeout finishes first
      setVideoGenerationProgress(100); // Set to 100% at the end
      // Using a generic talking head GIF to simulate the video output
      setGeneratedVideoUrl('https://media.giphy.com/media/v1.S/media/l4FGyR3uE5cM7dJpm/giphy.gif'); // Example talking head GIF
      setLoadingVideo(false);
      showUserMessage("Video generation complete! Click 'Play Video' to view the simulation.", "Video Ready");
    }, totalDuration); // Simulate 15-second generation time
  };

  // Function to simulate playing the video (just displays the GIF)
  const handlePlayVideo = () => {
    if (generatedVideoUrl) {
      showUserMessage(
        <img src={generatedVideoUrl} alt="Generated Video" className="w-full h-auto rounded-lg" />,
        "Simulated Video Playback",
        null // No confirm button for playback modal
      );
    }
  };


  const todoNotes = notes.filter(note => note.status === 'todo');
  const completedNotes = notes.filter(note => note.status === 'completed');

  // Modal component for user messages and confirmations
  const Modal = ({ show, title, message, onClose, onConfirm, showConfirmButton = false, children }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full border border-gray-700 text-gray-100">
          <h3 className="text-xl font-bold mb-4 text-purple-400">{title}</h3>
          {/* Render message directly if it's a React node (like an img tag) */}
          {typeof message === 'string' ? <p className="text-gray-300 mb-6 whitespace-pre-wrap">{message}</p> : <div className="mb-6">{message}</div>}
          {children} {/* Render children for custom modal content (like input for prompt title) */}
          <div className="flex justify-end space-x-2 mt-4">
            {showConfirmButton && (
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 shadow-md"
              >
                Confirm
              </button>
            )}
            <button
              onClick={onClose}
              className={`${showConfirmButton ? 'bg-gray-600 hover:bg-gray-700' : 'bg-purple-600 hover:bg-purple-700'} text-white py-2 px-4 rounded-md transition duration-300 shadow-md`}
            >
              {showConfirmButton ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 p-4 font-sans text-gray-100 flex items-center justify-center">
      {/* Essential iOS meta tags for native-like app experience */}
      {/* These should ideally be in the <head> of index.html, but included here for context within the immersive */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <link rel="apple-touch-icon" href="https://placehold.co/180x180/8B5CF6/ffffff?text=AI" /> {/* Placeholder icon */}
      <link rel="apple-touch-startup-image" href="https://placehold.co/1125x2436/8B5CF6/ffffff?text=Loading" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
      {/* Add more startup images for different iPhone sizes as needed */}

      <Modal
        show={showModal}
        title={modalTitle}
        message={modalMessage}
        onClose={() => { setShowModal(false); setModalOnConfirm(null); setShowModalConfirmButton(false); }}
        onConfirm={modalOnConfirm}
        showConfirmButton={showModalConfirmButton}
      />

      {/* Modal for saving custom prompt */}
      <Modal
        show={showSavePromptModal}
        title="Save Custom Prompt"
        message="Enter a title for your new prompt:"
        onClose={() => setShowSavePromptModal(false)}
        onConfirm={saveCustomPrompt}
        showConfirmButton={true}
      >
        <input
          type="text"
          placeholder="Prompt Title"
          value={newPromptTitle}
          onChange={(e) => setNewPromptTitle(e.target.value)}
          className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </Modal>

      <div className="flex flex-col w-full max-w-7xl bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Main Content Area - Always stacked */}
        <div className="p-6 lg:p-8 space-y-8"> {/* Removed custom-scrollbar and max-h */}
          <h1 className="text-3xl lg:text-4xl font-extrabold text-center text-purple-400 mb-6">
            Unified AI Assistant
          </h1>

          {userId && (
            <p className="text-center text-sm text-gray-400 mb-4">
              User ID: <span className="font-mono text-purple-300 break-all">{userId}</span>
            </p>
          )}

          {/* AI Assistant Avatar and Upload */}
          <section className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-purple-300 mb-4">Your AI Assistant</h2>
            <img
              src={aiAssistantAvatar}
              alt="Your AI Assistant Avatar"
              className="w-40 h-40 object-cover rounded-full border-4 border-purple-500 shadow-xl mb-4"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x150/6b46c1/ffffff?text=Error+Loading'; }}
            />
            <input
              type="file"
              ref={avatarFileInputRef}
              onChange={handleAvatarFileChange}
              className="hidden"
              accept="image/*,application/pdf"
            />
            <button
              onClick={triggerAvatarFileInput}
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loadingAi || loadingVideo}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-4 3 3 5-5V15z" clipRule="evenodd" />
              </svg>
              Upload AI Assistant Avatar (Image/PDF)
            </button>
          </section>

          {/* AI Assistant Input Section */}
          <section className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
            <h2 className="text-2xl font-bold text-purple-300 mb-4">AI Assistant Commands</h2>
            {selectedNoteForChat && (
              <div className="mb-4 p-3 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-700">
                <p className="text-sm text-purple-200">
                  Chatting with note: <span className="font-semibold">{selectedNoteForChat.title}</span>
                  <button
                    onClick={() => setSelectedNoteForChat(null)}
                    className="ml-3 text-red-400 hover:text-red-300 text-xs font-semibold"
                  >
                    (Exit Chat)
                  </button>
                </p>
                <div className="mt-2 h-40 overflow-y-auto custom-scrollbar p-2 bg-gray-800 rounded-md border border-gray-700">
                  {selectedNoteForChat.chatHistory && selectedNoteForChat.chatHistory.length > 0 ? (
                    selectedNoteForChat.chatHistory.map((msg, index) => (
                      <div key={index} className={`mb-2 p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-800 bg-opacity-50 text-blue-100 self-end' : 'bg-gray-600 text-gray-200 self-start'}`}>
                        <p className="font-semibold text-xs">{msg.role === 'user' ? 'You' : 'AI'}:</p>
                        <p className="whitespace-pre-wrap text-sm">{msg.parts[0].text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm italic">No chat history for this note yet. Start a conversation!</p>
                  )}
                </div>
              </div>
            )}
            <textarea
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y min-h-[100px]"
              placeholder={editingNote ? "Edit your note content here..." : selectedNoteForChat ? "Type your message to the AI about this note..." : "Enter your command for the AI (e.g., 'Add a task: write report', 'Summarize my notes', 'Generate a marketing video script for my new product')..."}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={loadingAi || loadingVideo}
            ></textarea>
            {uploadedImagePreview && (
              <div className="mt-3 p-2 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
                <img src={uploadedImagePreview} alt="Uploaded" className="max-w-[100px] max-h-[100px] rounded-md object-contain" />
                <span className="text-gray-300 text-sm ml-3">Image attached.</span>
                <button
                  onClick={clearMainImage}
                  className="ml-auto text-red-400 hover:text-red-300 text-xs font-semibold"
                >
                  Clear Image
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {editingNote ? (
                <button
                  onClick={handleUpdateNote}
                  className="flex-1 min-w-[150px] bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loadingAi || loadingVideo}
                >
                  Update Note
                </button>
              ) : (
                <>
                  <button
                    onClick={triggerMainImageInput}
                    className="flex-1 min-w-[150px] bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loadingAi || loadingVideo}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-4 3 3 5-5V15z" clipRule="evenodd" />
                    </svg>
                    Upload Image to Prompt
                  </button>
                  <input
                    type="file"
                    ref={mainImageInputRef}
                    onChange={handleMainImageFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    onClick={() => handleUserCommand(false)}
                    className="flex-1 min-w-[150px] bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loadingAi || loadingVideo || (!userInput.trim() && !uploadedImage)}
                  >
                    {loadingAi ? (
                      <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.002 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.76-1.39A6.46 6.46 0 001 14.5V10a9 9 0 019-9c4.418 0 8 3.134 8 7zM12.5 9a.5.5 0 100-1h-5a.5.5 0 000 1h5z" clipRule="evenodd" />
                      </svg>
                    )}
                    Ask AI Assistant
                  </button>
                  <button
                    onClick={() => handleUserCommand(true)} // Pass true to indicate upgrade
                    className="flex-1 min-w-[150px] bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loadingAi || loadingVideo || !userInput.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414L10.586 3.707a1 1 0 011.414 0l5.293 5.293a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    Upgrade Prompt
                  </button>
                  <button
                    onClick={() => setShowSavePromptModal(true)}
                    className="flex-1 min-w-[150px] bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loadingAi || loadingVideo || !userInput.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zm0 2h10v6H5V6zm-3 8a2 2 0 00-2 2v2a2 2 0 002 2h16a2 2 0 002-2v-2a2 2 0 00-2-2H2z" />
                    </svg>
                    Save as Custom Prompt
                  </button>
                </>
              )}
            </div>
            {aiError && (
              <p className="text-red-400 text-sm mt-3 p-2 bg-red-900 bg-opacity-30 rounded-md border border-red-700">
                {aiError}
              </p>
            )}
            {simulatedThinkingSteps.length > 0 && (
              <div className="mt-4 text-sm text-gray-400">
                <p className="font-semibold text-purple-300">AI's Thought Process:</p>
                <div className="mt-2 space-y-1">
                  {simulatedThinkingSteps.map((step, index) => (
                    <p key={index} className={index <= currentSimulatedStepIndex ? 'text-gray-200' : 'text-gray-600'}>
                      {index <= currentSimulatedStepIndex ? `✓ ${step}` : `○ ${step}`}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Video Generation Section */}
          <section className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
            <h2 className="text-2xl font-bold text-purple-300 mb-4">Video Generation</h2>
            {videoScriptResponse && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-300 text-sm font-semibold">AI Generated Script:</p>
                <p className="text-gray-200 mt-1 whitespace-pre-wrap text-sm italic">{videoScriptResponse}</p>
                <button
                  onClick={handleGenerateVideoFromCloneResponse}
                  className="w-full mt-3 bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loadingAi || loadingVideo || !videoScriptResponse.trim()}
                >
                  {loadingVideo ? (
                    <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.002 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      <path d="M14.5 9a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1z" />
                    </svg>
                  )}
                  Generate Video ({videoGenerationProgress}%)
                </button>
                {videoGenerationProgress > 0 && videoGenerationProgress < 100 && (
                  <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                    <div className="bg-teal-500 h-2.5 rounded-full" style={{ width: `${videoGenerationProgress}%` }}></div>
                  </div>
                )}
              </div>
            )}

            {generatedVideoUrl && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700 text-center">
                <p className="text-gray-300 text-sm font-semibold mb-2">Video Generated:</p>
                <button
                  onClick={handlePlayVideo}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 shadow-md flex items-center justify-center mx-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play Video
                </button>
              </div>
            )}
          </section>

          {/* Notes Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-purple-300">Your Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* To-Do Notes */}
              <div className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
                <h3 className="text-xl font-semibold text-yellow-300 mb-4">To-Do</h3>
                {todoNotes.length === 0 ? (
                  <p className="text-gray-400 italic">No to-do notes yet. Ask the AI to add one!</p>
                ) : (
                  <ul className="space-y-4">
                    {todoNotes.map(note => (
                      <li key={note.id} className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                        <h4 className="font-bold text-lg text-gray-100 mb-2">{note.title}</h4>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={() => startEditing(note)}
                            className="text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md transition duration-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition duration-300"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => toggleNoteStatus(note)}
                            className="text-sm bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded-md transition duration-300"
                          >
                            Mark Completed
                          </button>
                          <button
                            onClick={() => setSelectedNoteForChat(note)}
                            className="text-sm bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded-md transition duration-300"
                          >
                            Chat with AI
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Completed Notes */}
              <div className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
                <h3 className="text-xl font-semibold text-green-300 mb-4">Completed</h3>
                {completedNotes.length === 0 ? (
                  <p className="text-gray-400 italic">No completed notes yet. Great job!</p>
                ) : (
                  <ul className="space-y-4">
                    {completedNotes.map(note => (
                      <li key={note.id} className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 opacity-70">
                        <h4 className="font-bold text-lg text-gray-100 line-through mb-2">{note.title}</h4>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={() => toggleNoteStatus(note)}
                            className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-md transition duration-300"
                          >
                            Mark To-Do
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition duration-300"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setSelectedNoteForChat(note)}
                            className="text-sm bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded-md transition duration-300"
                          >
                            Chat with AI
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Prompt Library Section */}
          <section className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
            <h2 className="text-2xl font-bold text-purple-300 mb-4">Prompt Library</h2>
            <div className="space-y-6">
              {/* Business Prompts */}
              <div>
                <h3 className="text-xl font-semibold text-cyan-300 mb-3">Business Prompts</h3>
                {businessPromptLibrary.map((category, catIndex) => (
                  <div key={catIndex} className="mb-4">
                    <h4 className="text-lg font-medium text-cyan-200 mb-2">{category.category}</h4>
                    <ul className="space-y-2">
                      {category.prompts.map((prompt, promptIndex) => (
                        <li key={promptIndex} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between shadow-sm border border-gray-700">
                          <span className="text-gray-200 text-sm">{prompt.title}</span>
                          <button
                            onClick={() => loadPromptToInput(prompt.content)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded-md transition duration-300"
                          >
                            Load
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Custom Prompts */}
              <div>
                <h3 className="text-xl font-semibold text-fuchsia-300 mb-3">Your Custom Prompts</h3>
                {customPrompts.length === 0 ? (
                  <p className="text-gray-400 italic">No custom prompts saved yet. Save your favorite prompts!</p>
                ) : (
                  <ul className="space-y-2">
                    {customPrompts.map(prompt => (
                      <li key={prompt.id} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between shadow-sm border border-gray-700">
                        <span className="text-gray-200 text-sm">{prompt.title}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadPromptToInput(prompt.content)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded-md transition duration-300"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteCustomPrompt(prompt.id)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-3 rounded-md transition duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      {/* Custom Scrollbar Styling (for custom-scrollbar class) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #4a5568; /* gray-700 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #8b5cf6; /* purple-500 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #7c3aed; /* purple-600 */
        }
        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #8b5cf6 #4a5568;
        }
      `}</style>
    </div>
  );
}

export default App;

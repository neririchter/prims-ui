// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  styled,
  IconButton,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { getChatStatus, startChat } from "./http/ChatService";
import CollapsibleSidebar from "./components/CollapsibleSidebar";
import ChatComponent from "./components/ChatContainer";
import GraphDrawer from "./components/GraphSection"; // Import the drawer component

// Styled components for layout
const AppContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100vh',
  overflow: 'hidden'
}));

// Container for the Chat section and graph toggle button
const ChatSectionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  height: '100vh',
  position: 'relative'
}));

// Styled container for the chat paper
const ChatPaperContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  width: '100%',
  height: '100%'
}));

// Button to toggle graph drawer
const GraphToggleButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 1100,
  backgroundColor: '#00897B',
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  }
}));

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [graphDrawerOpen, setGraphDrawerOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { id: 'chat1', title: 'Weather forecast query', date: '2025-05-05' },
    { id: 'chat2', title: 'Stock price analysis', date: '2025-05-04' },
    { id: 'chat3', title: 'Travel planning assistant', date: '2025-05-03' }
  ]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [updateCount, setUpdateCount] = useState(0); // Track updates for debugging
  const messagesEndRef = useRef(null);

  // Store chatId in a ref so it's accessible inside the interval callback
  const chatIdRef = useRef(null);

  // Store chat result to avoid duplicate messages
  const resultRef = useRef(null);

  // Store the previous chat data for comparison
  const prevChatDataRef = useRef(null);

  // Track if plan visualization has been shown already
  const planVisualizationShownRef = useRef(false);

  // Check if chat status is final
  const isFinalStatus = (status) => {
    return ['COMPLETED', 'FAILED', 'ERROR'].includes(status);
  };

  // Function to show notification
  const showNotification = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Toggle graph drawer
  const toggleGraphDrawer = () => {
    setGraphDrawerOpen(!graphDrawerOpen);
  };

  // Select a chat from history
  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    // In a real app, you would fetch this chat's messages and plan
    setMessages([
      { id: 1, text: "What will the weather be like tomorrow?", isUser: true },
      { id: 2, text: "I'll check the weather forecast for tomorrow for you.", isUser: false }
    ]);
  };

  // Deep comparison function for chat data
  const hasChanged = useCallback((newData, prevData) => {
    if (!prevData) return true;

    // Compare completion status
    if (newData.status !== prevData.status) return true;

    // Compare plan tasks
    if (!newData.plan?.tasks && prevData.plan?.tasks) return true;
    if (newData.plan?.tasks && !prevData.plan?.tasks) return true;

    if (newData.plan?.tasks && prevData.plan?.tasks) {
      // Check if task counts differ
      if (newData.plan.tasks.length !== prevData.plan.tasks.length) return true;

      // Check for changes in task status
      for (let i = 0; i < newData.plan.tasks.length; i++) {
        const newTask = newData.plan.tasks[i];
        const prevTask = prevData.plan.tasks.find(t => t.task_id === newTask.task_id);

        if (!prevTask) return true; // New task added

        // Check if status changed
        if (newTask.execution_status !== prevTask.execution_status) return true;

        // Check if progress changed
        if (newTask.progress_percentage !== prevTask.progress_percentage) return true;
      }
    }

    // Check result
    if (newData.result !== prevData.result) return true;

    return false;
  }, []);

  // Send a new message
  const handleSendMessage = async (messageData) => {
    if (!messageData.text.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: messageData.text,
      isUser: true,
      domain: messageData.domain,
      solution: messageData.solution
    };

    setMessages(prev => [...prev, newMessage]);
    setUserInput('');

    // Reset plan visualization shown flag when starting a new chat
    planVisualizationShownRef.current = false;

    // Start chat processing
    await startNewChat(messageData.text, messageData.domain, messageData.solution);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update the ref when chatId changes
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  // Open graph drawer automatically when plan is available
  useEffect(() => {
    if (chatData?.plan?.tasks &&
        chatData.plan.tasks.length > 0 &&
        !graphDrawerOpen &&
        !planVisualizationShownRef.current &&
        !isFinalStatus(chatData.status)) {
      console.log("Opening graph drawer because tasks are available:", chatData.plan.tasks);
      setGraphDrawerOpen(true);
      planVisualizationShownRef.current = true;
      showNotification("Task plan is now available! Opening visualization.");
    }
  }, [chatData?.plan?.tasks, graphDrawerOpen, chatData?.status]);

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        console.log("Cleaning up polling interval on unmount");
      }
    };
  }, [pollInterval]);

  // Start a new chat session
  const startNewChat = async (query, domain, solution) => {
    setLoading(true);
    setError(null);
    setUpdateCount(0);

    // Reset the result ref when starting a new chat
    resultRef.current = null;
    prevChatDataRef.current = null;
    planVisualizationShownRef.current = false;

    try {
      // Clear any existing polling interval
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }

      console.log(`Starting chat with query: "${query}", domain: "${domain}", solution: "${solution}"`);
      const response = await startChat(query, domain || 'general', solution);
      console.log("Chat started response:", response.data);

      const id = response.data.id;
      setChatId(id);
      chatIdRef.current = id;

      // Immediately fetch status once
      await fetchChatStatus();

      // Start polling for status - using shorter interval for more frequent updates
      // 15 seconds is a good balance between responsiveness and server load
      const interval = setInterval(fetchChatStatus, 1000);
      setPollInterval(interval);
      console.log("Polling started with interval ID:", interval);

      showNotification("Chat started successfully. Updates will appear automatically.");
    } catch (err) {
      console.error("Error starting chat:", err);
      const errorMessage = `Failed to start chat: ${err.message}`;
      setError(errorMessage);

      // Add error message to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Sorry, there was an error processing your request. Please try again.",
        isUser: false,
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Manually refresh the chat status
  const manualRefresh = async () => {
    showNotification("Manually refreshing status...");
    await fetchChatStatus();
  };

  // Fetch the chat status
  const fetchChatStatus = async () => {
    const id = chatIdRef.current;
    if (!id) {
      console.log("No chat ID available, skipping status check");
      return;
    }

    console.log(`Fetching status for chat ID: ${id}`);
    try {
      const response = await getChatStatus(id);
      console.log("Status response:", response.data);

      // Store previous data for comparison
      const prevData = prevChatDataRef.current;
      prevChatDataRef.current = response.data;

      // Check if there are meaningful changes
      const changed = hasChanged(response.data, prevData);

      if (changed) {
        console.log("Chat data changed, updating state");
        setChatData(response.data);
        setUpdateCount(prev => prev + 1);

        // Show notification on update only if status isn't completed/final
        if (prevData && !isFinalStatus(response.data.status)) {
          showNotification(`Plan updated (${updateCount + 1}): ${new Date().toLocaleTimeString()}`);
        }
      } else {
        console.log("No significant changes detected");
      }

      // Add system message when there's a result
      if (response.data && 'result' in response.data &&
          response.data.result &&
          response.data.result !== resultRef.current) {
        console.log("New result received:", response.data.result);

        // Save current result to avoid duplicates
        resultRef.current = response.data.result;

        // Add message to chat with special styling for server results
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: response.data.result,
          isUser: false,
          isServerResult: true,
          timestamp: new Date()
        }]);

        // Notify user about received result
        showNotification("Response received from server");
      }

      // Stop polling when status is final (completed, failed, error)
      if (isFinalStatus(response.data.status)) {
        if (pollInterval) {
          console.log(`Chat ${id} finished with status: ${response.data.status}`);
          clearInterval(pollInterval);
          setPollInterval(null);
          setLoading(false);
          showNotification(`Chat processing ${response.data.status.toLowerCase()}. No more updates.`);
        }

        // When completed, ensure we don't show plan visualization notification again
        planVisualizationShownRef.current = true;
      }
    } catch (err) {
      console.error("Error fetching chat status:", err);
      setError(`Failed to fetch chat status: ${err.message}`);
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      setLoading(false);
    }
  };

  return (
      <AppContainer>
        {/* Left Sidebar - Chat History */}
        <CollapsibleSidebar
            open={sidebarOpen}
            onToggle={toggleSidebar}
            title="Chat History"
            items={chatHistory}
            selectedItem={selectedChat}
            onItemClick={handleSelectChat}
        />

        {/* Chat Section with Graph Toggle Button */}
        <ChatSectionContainer>
          <ChatPaperContainer>
            <Paper elevation={3} sx={{ height: '100%', width: '100%' }}>
              <ChatComponent
                  chatTitle="Support Chat"
                  initialMessages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={loading}
                  onRefresh={manualRefresh}
                  updateCount={updateCount}
              />
            </Paper>
          </ChatPaperContainer>

          {/* Button to toggle graph drawer */}
          <Tooltip title="Toggle Task Plan Visualization">
            <GraphToggleButton
                onClick={toggleGraphDrawer}
                size="large"
                aria-label="show task plan"
                color={chatData?.plan?.tasks ? "secondary" : "default"}
            >
              <AccountTreeIcon />
            </GraphToggleButton>
          </Tooltip>
        </ChatSectionContainer>

        {/* Graph Drawer Component */}
        <GraphDrawer
            open={graphDrawerOpen}
            onClose={toggleGraphDrawer}
            loading={loading}
            error={error}
            chatData={chatData}
            onRefresh={manualRefresh}
            updateCount={updateCount}
        />

        {/* Status notifications */}
        <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
              onClose={() => setSnackbarOpen(false)}
              severity="info"
              sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </AppContainer>
  );
}

export default App;

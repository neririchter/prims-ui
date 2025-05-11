import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  styled,
  Paper,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid, Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

/**
 * Styled components for the chat interface
 */
const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  borderRight: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  boxShadow: theme.shadows[3],
  backgroundColor: '#FAF9F5',
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  color: 'black',
  backgroundColor: '#FAF9F5',
}));

const ChatMessages = styled(Box)(({ theme, isEmpty }) => ({
  flexGrow: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  backgroundColor: '#FAF9F5',
  // If empty, set a minimal height; otherwise let it grow
  minHeight: isEmpty ? '0' : '200px',
}));

const MessageBubble = styled(Card)(({ theme, isUser, isServerResult }) => ({
  alignSelf: isUser ? 'flex-start' : 'flex-end',
  width: '80%',
  color: theme.palette.primary.contrastText,
  borderRadius: !isUser
      ? '18px 18px 4px 18px'
      : '18px 18px 18px 4px',
  boxShadow: theme.shadows[1],
}));

const MessageTimestamp = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'right',
}));

// New styled component for the input container
const InputContainer = styled(Box)(({ theme, isEmpty }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: isEmpty ? 'center' : 'flex-end',
  alignItems: 'center',
  // If chat is empty, this will take most of the space
  flex: isEmpty ? 1 : 'none',
  transition: 'all 0.3s ease-in-out',
}));

// New styled component for server result indicator
const ServerResultBadge = styled(Box)(({ theme }) => ({
  backgroundColor: '#4A148C',
  color: 'white',
  fontSize: '0.6rem',
  padding: '2px 6px',
  borderRadius: '10px',
  marginTop: theme.spacing(0.5),
  display: 'inline-block',
}));

const ChatComponent = ({
  chatTitle = 'New Chat',
  initialMessages = [],
  onSendMessage = () => {},
  isLoading = false,
  onRefresh = () => {},
  updateCount = 0,
  domainOptions = ['Fault Analysis', 'HotpotQA'],
  solutionOptions = ['ReAct', 'Prism']
}) => {
  // Use the messages directly from props instead of local state
  // This ensures we always show the latest messages from the parent
  const messages = initialMessages;

  const [userInput, setUserInput] = useState('');
  const [domain, setDomain] = useState('HotpotQA');
  const [solution, setSolution] = useState('Prism');
  const messagesEndRef = useRef(null);

  // Determine if chat is empty
  const isChatEmpty = messages.length === 0;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, updateCount]); // Also react to updateCount

  /**
   * Handle sending a new message
   */
  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    // Pass message to parent component for handling
    onSendMessage({
      text: userInput,
      domain: domain,
      solution: solution
    });

    // Clear input field
    setUserInput('');
  };

  /**
   * Format the timestamp for display
   * @param {Date} date - The date to format
   * @returns {string} Formatted time string
   */
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
      <ChatContainer>
        <ChatHeader>
          <Typography variant="h6">{chatTitle}</Typography>
        </ChatHeader>

        {/* Messages area - only show if there are messages */}
        <ChatMessages isEmpty={isChatEmpty}>
          {messages.map((message) => (
              <MessageBubble
                  key={message.id}
                  isUser={message.isUser}
                  isServerResult={message.isServerResult}
                  sx={{
                    mb: 1,
                    backgroundColor: message.isError
                        ? '#ffebee'
                        : message.isServerResult
                            ? '#6a1b9a' // Darker purple for server results
                            : (message.isUser ? '#00897B' : '#FF7043')
                  }}
              >
                <CardContent>
                  <Typography variant="body1">
                    {message.text}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {message.isServerResult && (
                        <ServerResultBadge>
                          Server Result
                        </ServerResultBadge>
                    )}
                    <MessageTimestamp variant="caption">
                      {message.timestamp ? formatTime(message.timestamp) : formatTime(new Date())}
                    </MessageTimestamp>
                  </Box>
                </CardContent>
              </MessageBubble>
          ))}
          <div ref={messagesEndRef} />
        </ChatMessages>

        {/* Input container - will be centered if chat is empty */}
        <InputContainer isEmpty={isChatEmpty}>
          <Paper style={{padding: 24, margin: 24, borderRadius: 12, width: 700}}>
            {/* Text input and send button */}
            <Box style={{justifyContent: 'center', display: 'flex'}}>
              <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type your message..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        border: 'none',
                      },
                      '&:hover fieldset': {
                        border: 'none',
                      },
                      '&.Mui-focused fieldset': {
                        border: 'none',
                      }
                    }
                  }}
              />
              <IconButton
                  onClick={handleSendMessage}
                  disabled={isLoading || !userInput.trim()}
                  sx={{
                    backgroundColor: (isLoading || !userInput.trim()) ? 'grey.300' : '#00897B',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    },
                    '&.Mui-disabled': {
                      color: 'grey.500'
                    }
                  }}
              >
                {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              </IconButton>
            </Box>
            <Divider sx={{mt: 5, mb: 2}}/>
            {/* Dropdowns for domain and solution */}
            <Box sx={{display: 'flex', width: "100%", justifyContent: 'space-between'}}>
              <Box sx={{width: '100%', paddingRight: 10}}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="domain-select-label">Domain</InputLabel>
                  <Select
                      variant={"outlined"}
                      labelId="domain-select-label"
                      value={domain}
                      label="Domain"
                      onChange={(e) => setDomain(e.target.value)}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {domainOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{width: '100%', paddingLeft: 10}}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="solution-select-label">Solution</InputLabel>
                  <Select
                      variant={"outlined"}
                      labelId="solution-select-label"
                      value={solution}
                      label="Solution"
                      onChange={(e) => setSolution(e.target.value)}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {solutionOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Paper>
        </InputContainer>
      </ChatContainer>
  );
};

export default ChatComponent;

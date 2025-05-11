// src/http/ChatService.js
import httpService from "./HttpService";

// Store chat metadata for mock responses
const statusRequestCounts = {};
const chatStartTimes = {};
const chatQueries = {};

//This function returns an ID for the chat session
export async function startChat(query, domain, solution) {
  // ALWAYS use mock in development for reliable testing
  const mockId = "chat-" + Math.random().toString(36).substring(2, 10);
  // Initialize counter for this new chat ID
  statusRequestCounts[mockId] = 0;
  chatStartTimes[mockId] = Date.now();
  chatQueries[mockId] = { query };

  // Mock response that returns an ID
  return Promise.resolve({
    data: {
      id: mockId,
      timestamp: new Date().toISOString(),
      message: "Chat session started successfully"
    },
    status: 200
  });

  // NOTE: Real implementation is commented out for now
  // return httpService.post('ui/chat', {query, domain, solution}, null);
}

// Define a standard set of tasks
const generateTaskList = (query) => {
  // Standard set of tasks for all queries
  const baseTasks = [
    { task_id: "t1", task_description: "Parse user query", task_type: "Reasoning", estimated_time: "1s" },
    { task_id: "t2", task_description: "Identify query intent", task_type: "Reasoning", estimated_time: "2s" },
    { task_id: "t3", task_description: "Search knowledge base", task_type: "Tool call", estimated_time: "3s" },
    { task_id: "t4", task_description: "Process and filter search results", task_type: "Reasoning", estimated_time: "2s" },
    { task_id: "t5", task_description: "Generate initial response", task_type: "Reasoning", estimated_time: "3s" },
    { task_id: "t6", task_description: "Verify response accuracy", task_type: "Reasoning", estimated_time: "2s" },
    { task_id: "t7", task_description: "Format final response", task_type: "Reasoning", estimated_time: "2s" }
  ];

  // Add complexity based on query length only
  if (query.length > 100) {
    baseTasks.splice(5, 0,
        { task_id: "t4a", task_description: "Perform fact-checking", task_type: "Tool call", estimated_time: "3s" },
        { task_id: "t4b", task_description: "Validate logical consistency", task_type: "Reasoning", estimated_time: "2s" }
    );
  }

  // Return the tasks with dependencies
  return baseTasks.map((task, index) => {
    // Each task depends on all previous tasks
    const dependencies = index === 0 ? [] : [baseTasks[index - 1].task_id];
    return {
      ...task,
      dependencies
    };
  });
};

// Generate a mock response (changes with each request)
const generateMockResponse = (id, count, query) => {
  const elapsedTime = (Date.now() - chatStartTimes[id]) / 1000; // time in seconds
  const tasks = generateTaskList(query);
  const totalTasks = tasks.length;

  // Calculate how many tasks should be completed based on time and request count
  // Advance approximately one task per 3 seconds (and also consider request count as a factor)
  const completedTasksCount = Math.min(
      Math.floor(elapsedTime / 3) + Math.floor(count / 3),
      totalTasks
  );

  // Update execution status for each task
  const updatedTasks = tasks.map((task, index) => {
    let execution_status = "pending";

    if (index < completedTasksCount) {
      execution_status = "completed";
    } else if (index === completedTasksCount) {
      execution_status = "in_progress";
    }

    return {
      ...task,
      execution_status,
      // Add more details for completed tasks
      ...(execution_status === "completed" && {
        completion_time: new Date(chatStartTimes[id] + (index + 1) * 3000).toISOString(),
        execution_details: `Executed ${task.task_type.toLowerCase()} successfully`
      }),
      // Add more details for in-progress tasks
      ...(execution_status === "in_progress" && {
        started_at: new Date(chatStartTimes[id] + completedTasksCount * 3000).toISOString(),
        progress_percentage: Math.floor(Math.random() * 40) + 30 // Between 30-70%
      })
    };
  });

  // Generate appropriate result based on completion status
  let result = null;
  let status = "IN_PROGRESS";

  if (completedTasksCount >= totalTasks) {
    status = "COMPLETED";

    // Generate a generic response
    result = `I've completed processing your query about "${query.substring(0, 30)}...". The answer incorporates the latest available information and considers multiple perspectives on the topic.`;
  }

  // Calculate and add metadata
  const progressPercentage = (completedTasksCount / totalTasks) * 100;
  const estimatedCompletionTime = status === "COMPLETED" ?
      null :
      new Date(chatStartTimes[id] + totalTasks * 3000).toISOString();

  return {
    data: {
      plan: {
        tasks: updatedTasks,
        progress: {
          completed_tasks: completedTasksCount,
          total_tasks: totalTasks,
          percentage: Math.floor(progressPercentage)
        },
        estimated_completion_time: estimatedCompletionTime
      },
      result,
      status,
      metadata: {
        query_length: query.length,
        processing_time: elapsedTime.toFixed(2) + "s",
        request_count: count
      }
    },
    status: 200
  };
};

//This function returns: plan, result, status
export async function getChatStatus(id) {
  // ALWAYS use mock for testing
  // Increment the counter for this chat ID
  if (!statusRequestCounts[id]) {
    statusRequestCounts[id] = 0;
    chatStartTimes[id] = Date.now();
    chatQueries[id] = { query: "Default query" };
  }
  statusRequestCounts[id]++;

  const { query } = chatQueries[id];
  return Promise.resolve(generateMockResponse(id, statusRequestCounts[id], query));

  // NOTE: Real implementation is commented out for now
  // return httpService.get(`ui/chat/${id}`, null, null);
}

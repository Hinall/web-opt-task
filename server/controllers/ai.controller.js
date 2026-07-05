import OpenAI from "openai";
import { addTask, updateTask, deleteTask, listTasks } from "../services/taskService.js";

const SYSTEM_PROMPT = `You are a helpful assistant that only answers questions about productivity, task management, and time management. If asked about anything unrelated, politely redirect the user back to those topics.

IMPORTANT RULES FOR TASK MANAGEMENT:
1. When the user asks to DELETE a task, you MUST first:
   - List the user's tasks using listTasks
   - Show the user which task(s) match their description
   - Ask them to confirm by task title which specific task they want to delete
   - ONLY call deleteTask AFTER the user confirms in their next message

2. When the user's request is ambiguous (e.g., multiple tasks match the description):
   - Always ask for clarification by showing matching tasks and asking which one(s) they mean
   - DO NOT guess or assume which task they want
   - Wait for the user to confirm before proceeding with the update/delete

3. Always show task details (title, status, due date) when listing or identifying tasks to help the user make decisions.`;

// Tool definitions for multi-step calling
const TOOLS = [
  {
    type: "function",
    function: {
      name: "addTask",
      description: "Creates a new task for the user",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Task title",
          },
          description: {
            type: "string",
            description: "Optional task description",
          },
          dueDate: {
            type: "string",
            description: "Task due date in ISO 8601 format (e.g., 2026-12-31T23:59:59Z)",
          },
          status: {
            type: "string",
            enum: ["pending", "in-progress", "done"],
            description: "Task status (defaults to 'pending' if not provided)",
          },
        },
        required: ["title", "dueDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateTask",
      description: "Updates an existing task",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The task _id to update",
          },
          title: {
            type: "string",
            description: "Task title",
          },
          description: {
            type: "string",
            description: "Task description",
          },
          dueDate: {
            type: "string",
            description: "Task due date in ISO 8601 format",
          },
          status: {
            type: "string",
            enum: ["pending", "in-progress", "done"],
            description: "Task status",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteTask",
      description: "Deletes a task",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The task _id to delete",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listTasks",
      description: "Lists all tasks for the user",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];


export const chatBasic = async (req, res) => {
  try {
    const { messages } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const mergedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const client = new OpenAI({
      baseURL: process.env.AI_BASE_URL?.trim(),
      apiKey: process.env.AI_API_KEY?.trim(),
    });

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL?.trim(),
      messages: mergedMessages,
    });

    const reply = response.choices[0]?.message?.content || "";
    res.json({ reply });
  } catch (error) {
    console.error("AI Request Failed Error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
};

export const chatStream = async (req, res) => {
  try {
    const { messages } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const mergedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const client = new OpenAI({
      baseURL: process.env.AI_BASE_URL?.trim(),
      apiKey: process.env.AI_API_KEY?.trim(),
    });

    // ⚠️  Call the API BEFORE setting SSE headers so that errors like 429
    // can still be returned as proper JSON HTTP responses (not empty streams).
    const stream = await client.chat.completions.create({
      model: process.env.AI_MODEL?.trim(),
      messages: mergedMessages,
      stream: true,
    });

    // Only switch to SSE mode once we know the API call succeeded
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      const chunkText = chunk.choices[0]?.delta?.content;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("AI Stream Request Failed Error:", error);

    const status = error?.status === 429 ? 429 : (error?.status || 500);
    const message = error?.status === 429
      ? "Rate limit reached. Please wait a moment and try again."
      : error?.message || "AI request failed";

    if (!res.headersSent) {
      // Headers not sent yet → we can still return a proper HTTP error
      return res.status(status).json({ error: message });
    }

    // Headers already sent (mid-stream error) → send SSE error event then close
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
};

/**
 * Chat with OpenAI/Groq using multi-step tool calling
 * Allows the model to chain multiple tool calls in sequence
 * (e.g., listTasks → find ID → updateTask)
 */
export const chatWithTools = async (req, res) => {
  try {
    const { messages } = req.body || {};
    const userId = req.user._id;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const systemPrompt = `${SYSTEM_PROMPT}

You have access to task management tools. Use them to help the user create, update, delete, or list tasks.
For date inputs, convert them to ISO 8601 format (e.g., 2026-12-31T23:59:59Z).
You can call multiple tools in sequence to complete a request.`;

    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const client = new OpenAI({
      baseURL: process.env.AI_BASE_URL?.trim(),
      apiKey: process.env.AI_API_KEY?.trim(),
    });

    // Multi-step tool calling loop
    const maxIterations = 5;
    let finalReply = null;
    let iterationCount = 0;

    for (iterationCount = 0; iterationCount < maxIterations; iterationCount++) {
      console.log(`\n--- Tool Calling Iteration ${iterationCount + 1} ---`);

      const response = await client.chat.completions.create({
        model: process.env.AI_MODEL?.trim(),
        messages: conversationMessages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const assistantMessage = response.choices[0]?.message;
      const toolCalls = assistantMessage?.tool_calls;

      // If no tool calls, this is the final answer
      if (!toolCalls || toolCalls.length === 0) {
        finalReply = assistantMessage?.content || "";
        console.log(`Final reply: ${finalReply}`);
        break;
      }

      // Add assistant message to conversation
      conversationMessages.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: toolCalls,
      });

      // Process each tool call
      for (const toolCall of toolCalls) {
        // OpenAI API nests function details under toolCall.function
        const { id: toolCallId, function: func } = toolCall;
        const { name, arguments: argsString } = func;
        console.log(`Tool called: ${name}`);
        console.log(`Arguments: ${argsString}`);

        let toolResult;

        try {
          const args = JSON.parse(argsString);

          // Route to appropriate service function (userId always injected server-side)
          if (name === "addTask") {
            toolResult = await addTask(userId, args);
          } else if (name === "updateTask") {
            const { id, ...updates } = args;
            toolResult = await updateTask(userId, id, updates);
          } else if (name === "deleteTask") {
            toolResult = await deleteTask(userId, args.id);
          } else if (name === "listTasks") {
            // listTasks takes no parameters besides userId
            toolResult = await listTasks(userId);
          } else {
            toolResult = { error: `Unknown tool: ${name}` };
          }
        } catch (error) {
          toolResult = { error: `Failed to parse arguments or execute tool: ${error.message}` };
        }

        console.log(`Tool result: ${JSON.stringify(toolResult).substring(0, 200)}...`);

        // Add tool result to conversation
        conversationMessages.push({
          tool_call_id: toolCallId,
          role: "tool",
          name,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // If we hit max iterations without a final reply
    if (!finalReply) {
      finalReply = "I wasn't able to complete this request, please try rephrasing.";
      console.log(`Max iterations (${maxIterations}) reached without final reply`);
    }

    res.json({ reply: finalReply });
  } catch (error) {
    console.error("Chat with Tools Request Failed Error:", error);
    res.status(500).json({ error: "Chat with tools request failed" });
  }
};

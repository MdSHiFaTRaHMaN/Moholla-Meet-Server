const { GoogleGenerativeAI } = require('@google/generative-ai');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Project = require('../models/Project');

// Candidate Gemini & Gemma models in priority order
const PREFERRED_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemma-4-31b-it',
  'gemini-flash-latest'
];

/**
 * Call Gemini API with automatic model fallbacks
 */
async function callGemini(systemInstruction, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in server environment.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of PREFERRED_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || undefined
      });
      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      console.warn(`[Gemini AI] Model ${modelName} failed, trying fallback... (${err.message.split('\n')[0]})`);
      lastError = err;
    }
  }

  throw new Error(lastError ? lastError.message : 'All Gemini model attempts failed.');
}

/**
 * Main AI Assistant Controller endpoint
 */
exports.generateAssistantResponse = async (req, res) => {
  try {
    const { prompt, action, context } = req.body;
    const userName = req.user?.name || 'Team Member';

    // System prompt setting the AI persona & formatting rules
    const systemPersona = `You are CollabSpace AI, an intelligent project management and collaboration assistant embedded inside CollabSpace workspace.
Your goals:
1. Always directly answer the user's specific question first.
2. Address the user (${userName}) professionally and politely.
3. Keep responses relevant to what was asked. Only add extra workspace tips or feature overviews if relevant or specifically requested.
4. Format output cleanly using standard markdown (headings, bold text, bullet points, code blocks).`;

    let userPromptToSend = prompt || '';
    let responseText = '';

    // Handle Action-specific workspace context retrieval
    if (action === 'summarize_tasks') {
      let tasks = [];
      try {
        tasks = await Task.find({}).limit(20).populate('assignees', 'name');
      } catch (_) {}

      const taskSummaryData = tasks.map(t => ({
        title: t.title,
        status: t.columnId || 'todo',
        priority: t.priority || 'Medium',
        assignees: t.assignees?.map(a => a.name).join(', ') || 'Unassigned'
      }));

      userPromptToSend = `Please summarize the current workspace task status for ${userName}.
Task Data: ${JSON.stringify(taskSummaryData, null, 2)}
User Query / Instructions: "${prompt || 'Provide a high-level sprint summary, highlight priorities, and note potential bottlenecks.'}"`;
    } 
    else if (action === 'draft_doc') {
      userPromptToSend = `Draft a comprehensive document or feature specification for CollabSpace workspace based on this requirement: "${prompt || 'Project Overview & Roadmap'}".
Include headers, bullet points, key objectives, architecture overview, and target milestones. Return clean HTML or Markdown that can be pasted directly into a document editor.`;
    }
    else if (action === 'suggest_tasks') {
      let tasks = [];
      try {
        tasks = await Task.find({}).limit(15);
      } catch (_) {}

      userPromptToSend = `Based on current existing project tasks (${tasks.map(t => t.title).join(', ') || 'No active tasks yet'}), suggest 5 high-value action items or subtasks that the team should work on next. Format as a clean checklist.`;
    }
    else if (action === 'improve_text') {
      userPromptToSend = `Improve, polish, and professionalize the following text while maintaining its core meaning:\n\n"${prompt}"`;
    }
    else {
      // General chat with workspace context summary
      userPromptToSend = prompt || 'Hello! What can you help me with?';
    }

    // Call Gemini API
    responseText = await callGemini(systemPersona, userPromptToSend);

    res.json({
      success: true,
      response: responseText
    });
  } catch (err) {
    console.error('[CollabSpace AI Controller Error]:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate response from Gemini AI.'
    });
  }
};


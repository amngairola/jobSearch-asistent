const { getGroqClient } = require('../utils/groqClient');
const { validateResume, validateJob, validateApplication } = require('../utils/validation');
const fileStore = require('../utils/fileStore');

/**
 * BaseAgent provides a wrapper around Groq chat completions with tool calling support.
 * It handles multiple tool calls, validates arguments against provided schemas, enforces
 * a maximum iteration limit, and returns the final assistant response.
 */
class BaseAgent {
  constructor() {
    this.client = getGroqClient();
    this.maxIterations = 5; // safeguard against infinite loops
    // tools map: name -> { description, parameters, validator, func }
    this.toolMap = new Map();
  }

  /** Register a tool definition (compatible with Groq function calling) */
  registerTool({ name, description = '', parameters = {}, validator = null, func }) {
    if (!name || typeof func !== 'function') {
      throw new Error('Tool registration requires a name and a function implementation');
    }
    this.toolMap.set(name, { description, parameters, validator, func });
  }

  /** Validate args against a JSON schema validator (Ajv compiled function) */
  _validateArgs(validator, args) {
    const valid = validator(args);
    if (!valid) {
      const errors = validator.errors.map(e => `${e.instancePath} ${e.message}`).join(', ');
      throw new Error(`Argument validation failed: ${errors}`);
    }
    return true;
  }

  /** Execute a tool implementation */
  async _executeTool(name, args) {
    const tool = this.toolMap.get(name);
    if (!tool) throw new Error(`Tool ${name} not registered`);
    if (tool.validator) this._validateArgs(tool.validator, args);
    return await tool.func(args);
  }

  /** Build Groq tool schema objects for the LLM */
  _buildToolSchemas() {
    const schemas = [];
    for (const [name, def] of this.toolMap.entries()) {
      schemas.push({
        type: 'function',
        function: {
          name,
          description: def.description,
          parameters: def.parameters
        }
      });
    }
    return schemas;
  }

  /** Run a chat with the LLM, handling tool calls automatically */
  async runChat(systemPrompt, userMessage, extraMessages = []) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...extraMessages,
      { role: 'user', content: userMessage },
    ];

    const tools = this._buildToolSchemas();
    const toolsArg = tools.length > 0 ? tools : undefined;
    const seenCalls = new Set(); // prevent duplicate tool calls
    let iteration = 0;

    while (iteration < this.maxIterations) {
      try {
        const requestPayload = {
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
          messages,
        };
        if (toolsArg && toolsArg.length > 0) {
          requestPayload.tools = toolsArg;
          requestPayload.tool_choice = 'auto';
        }

        const response = await this.client.chat.completions.create(requestPayload);
        const choice = response.choices[0];
        const message = choice.message;

        if (message.tool_calls && message.tool_calls.length > 0) {
          // Add the assistant message with tool_calls to history
          messages.push({
            role: 'assistant',
            content: message.content || null,
            tool_calls: message.tool_calls
          });

          // Process each tool call
          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const callKey = `${toolName}:${toolCall.function.arguments}`;

            let toolResult;
            if (seenCalls.has(callKey)) {
              // Prevent duplicate identical calls
              toolResult = { note: 'This tool was already called with the same arguments. Use the previous result.' };
            } else {
              seenCalls.add(callKey);
              try {
                const args = JSON.parse(toolCall.function.arguments || '{}');
                toolResult = await this._executeTool(toolName, args);
              } catch (toolErr) {
                console.error(`Tool ${toolName} error:`, toolErr.message);
                toolResult = { error: toolErr.message };
              }
            }

            // Add tool response with required tool_call_id
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
            });
          }

          iteration++;
          continue;
        } else {
          // No tool calls — return the final text response
          return message.content || 'I processed your request but have no additional response.';
        }
      } catch (apiError) {
        console.error('Groq API error in runChat:', apiError.message);
        if (apiError.message?.includes('rate_limit') || apiError.status === 429) {
          // Wait and retry
          await new Promise(r => setTimeout(r, 2000));
          iteration++;
          continue;
        }
        throw apiError;
      }
    }

    // If we exceeded iterations, ask the model to summarize what it has
    try {
      messages.push({
        role: 'user',
        content: 'Please provide your final answer based on the information gathered so far.'
      });
      const finalResponse = await this.client.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages,
      });
      return finalResponse.choices[0].message.content || 'I reached the maximum number of steps. Please try a simpler request.';
    } catch (_) {
      return 'I reached the maximum number of processing steps. Here is what I found so far based on the tools executed.';
    }
  }
}

module.exports = BaseAgent;

import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { queryReadOnly } from "./database.js";
import { DB_SCHEMA } from "./schema.js";
import { validateSQL } from "./sql-guard.js";

const SYSTEM_PROMPT = `You are a Business Intelligence assistant for an ecommerce store. You help users explore their data by answering questions in plain English.

You have access to a MySQL database with the following schema:

${DB_SCHEMA}

When the user asks a question about the data, you MUST follow this process:
1. Generate a SQL query to answer it.
2. Wrap the query in a <sql> tag like this: <sql>SELECT ...</sql>
3. You will then receive the query results and must provide a clear, helpful answer based on them.

Rules:
- Only generate SELECT queries. Never modify data.
- Always include a reasonable LIMIT (max 500 rows).
- Use JOINs when the question spans multiple tables.
- Format numbers, currencies, and dates nicely in your answers.
- If the question is ambiguous, pick the most reasonable interpretation and explain your assumption.
- If a question cannot be answered from the available data, say so.
- When presenting results, use markdown tables for tabular data and bullet points for summaries.
- Keep answers concise and focused on what was asked.`;

function extractSQL(text: string): string | null {
  const match = text.match(/<sql>([\s\S]*?)<\/sql>/);
  return match ? match[1].trim() : null;
}

export function createChat() {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const llm = new ChatOpenAI({ model });

  return {
    async *stream(
      message: string,
      history?: Array<{ role: string; message?: string; content?: string }>,
    ) {
      const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];

      if (history && Array.isArray(history)) {
        for (const item of history) {
          const content = item.message ?? item.content;
          if (typeof content !== "string" || !content) continue;
          if (item.role === "user") {
            messages.push(new HumanMessage(content));
          } else {
            messages.push(new AIMessage(content));
          }
        }
      }

      messages.push(new HumanMessage(message));

      const promptLen = SYSTEM_PROMPT.length;
      console.log(
        `[chat] Model: ${model} | Messages: ${messages.length} | Prompt: ${promptLen} chars (~${Math.ceil(promptLen / 4)} tokens)`,
      );

      // Step 1: Ask the LLM to generate SQL
      let sqlGenerationResponse = "";
      const sqlStream = await llm.stream(messages);
      for await (const chunk of sqlStream) {
        const text = chunk.content;
        if (typeof text === "string" && text) {
          sqlGenerationResponse += text;
        }
      }

      const sql = extractSQL(sqlGenerationResponse);

      if (!sql) {
        // No SQL needed, just stream the response directly (general question)
        const directStream = await llm.stream(messages);
        for await (const chunk of directStream) {
          const text = chunk.content;
          if (typeof text === "string" && text) {
            yield text;
          }
        }
        return;
      }

      // Step 2: Validate the SQL
      const validation = validateSQL(sql);
      if (!validation.valid) {
        yield `I generated a query but it was rejected by the safety filter: ${validation.error}. Let me try to answer differently.\n\n`;
        // Ask LLM to answer without SQL
        messages.push(new AIMessage(sqlGenerationResponse));
        messages.push(
          new HumanMessage(
            `The SQL query was rejected (${validation.error}). Please answer the original question without using that query, or explain that you cannot.`,
          ),
        );
        const retryStream = await llm.stream(messages);
        for await (const chunk of retryStream) {
          const text = chunk.content;
          if (typeof text === "string" && text) {
            yield text;
          }
        }
        return;
      }

      // Step 3: Execute the query
      const sanitizedSQL = validation.sanitized as string;
      console.log(`[chat] Executing SQL: ${sanitizedSQL}`);

      let queryResult: string;
      try {
        const { rows, fields } = await queryReadOnly(sanitizedSQL);
        if (rows.length === 0) {
          queryResult = "The query returned no results.";
        } else {
          queryResult = JSON.stringify({ fields, rows, rowCount: rows.length }, null, 2);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[chat] SQL error: ${errMsg}`);
        queryResult = `Query execution error: ${errMsg}`;
      }

      // Yield the SQL block so the user can see it
      yield `**Query:**\n\`\`\`sql\n${sanitizedSQL}\n\`\`\`\n\n`;

      // Step 4: Send results to LLM for natural language answer
      messages.push(new AIMessage(sqlGenerationResponse));
      messages.push(
        new HumanMessage(
          `Here are the query results:\n\n${queryResult}\n\nNow provide a clear, well-formatted answer to the original question based on these results. Do not include the SQL query again.`,
        ),
      );

      const answerStream = await llm.stream(messages);
      for await (const chunk of answerStream) {
        const text = chunk.content;
        if (typeof text === "string" && text) {
          yield text;
        }
      }
    },
  };
}

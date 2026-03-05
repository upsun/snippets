import { ChatOpenAI } from "@langchain/openai";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export interface ClassificationResult {
	category: string;
	urgency: string;
	sentiment: string;
	product: string | null;
	customerName: string | null;
	customerEmail: string | null;
	referenceNumbers: string[];
	summary: string;
	suggestedActions: string[];
}

const SYSTEM_PROMPT = `You are a support ticket classifier for Upsun, a Platform-as-a-Service (PaaS) hosting provider. Analyze support tickets and extract structured metadata.

Upsun products and services include:
- Web application hosting (PHP, Python, Node.js, Go, Java, Ruby, etc.)
- Database services (MySQL, PostgreSQL, MariaDB, MongoDB, Redis, Elasticsearch)
- Environment management (staging, production, preview environments)
- Git-based deployments
- CLI tools
- API access
- Domains and SSL certificates
- Resource scaling (CPU, RAM, disk)
- Backups and disaster recovery

Classify each ticket into exactly ONE category:
- Billing: Payment issues, invoices, pricing questions, plan changes, refunds
- Technical: Deployment failures, errors, performance issues, configuration help
- Feature Request: Suggestions for new features or improvements
- Bug Report: Reports of unexpected behavior or defects
- Account: Login issues, access management, team permissions, profile changes
- General Inquiry: Questions that don't fit other categories

Determine urgency level:
- Critical: Production down, security breach, data loss risk
- High: Major functionality impaired, blocking deployment
- Medium: Issue affecting workflow but workaround exists
- Low: General questions, minor issues, future planning

Determine sentiment:
- Positive: Happy, grateful, complimentary
- Neutral: Matter-of-fact, informational
- Negative: Frustrated, angry, disappointed

Extract:
- Product/service mentioned (if any)
- Customer name (if mentioned)
- Customer email (if mentioned)
- Reference numbers (ticket IDs, order numbers, project IDs, environment names)
- Brief summary (1 sentence)
- Suggested actions for support team (2-3 actionable items)

Respond ONLY with valid JSON matching this exact structure:
{
  "category": "string",
  "urgency": "string",
  "sentiment": "string",
  "product": "string or null",
  "customerName": "string or null",
  "customerEmail": "string or null",
  "referenceNumbers": ["array of strings"],
  "summary": "string",
  "suggestedActions": ["array of strings"]
}`;

export async function classifyTicket(ticketText: string): Promise<ClassificationResult> {
	const model = new ChatOpenAI({
		modelName: OPENAI_MODEL,
		temperature: 0,
	});

	const response = await model.invoke([
		{ role: "system", content: SYSTEM_PROMPT },
		{ role: "user", content: ticketText },
	]);

	const content = response.content as string;

	// Extract JSON from response (handle potential markdown code blocks)
	let jsonStr = content;
	const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (jsonMatch) {
		jsonStr = jsonMatch[1].trim();
	}

	const result = JSON.parse(jsonStr) as ClassificationResult;

	// Validate required fields
	if (!result.category || !result.urgency || !result.sentiment) {
		throw new Error("Invalid classification response: missing required fields");
	}

	return result;
}

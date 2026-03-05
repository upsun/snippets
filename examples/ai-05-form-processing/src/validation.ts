import type { NextFunction, Request, Response } from "express";

const MAX_TICKET_LENGTH = 10000;
const MIN_TICKET_LENGTH = 10;

export function validateTicketInput(req: Request, res: Response, next: NextFunction): void {
	const { ticket } = req.body;

	if (!ticket || typeof ticket !== "string") {
		res.status(400).json({ error: "Missing or invalid 'ticket' field" });
		return;
	}

	const trimmed = ticket.trim();

	if (trimmed.length < MIN_TICKET_LENGTH) {
		res.status(400).json({ error: `Ticket must be at least ${MIN_TICKET_LENGTH} characters` });
		return;
	}

	if (trimmed.length > MAX_TICKET_LENGTH) {
		res
			.status(400)
			.json({ error: `Ticket exceeds maximum length of ${MAX_TICKET_LENGTH} characters` });
		return;
	}

	req.body.ticket = trimmed;
	next();
}

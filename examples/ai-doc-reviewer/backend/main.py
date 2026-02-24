# backend/main.py
import os
from pathlib import Path
from dotenv import load_dotenv
import json
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI

# --------------------------------------------------
# Environment
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

load_dotenv(BASE_DIR / "backend" / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not found. Check your .env file.")

client = OpenAI(api_key=OPENAI_API_KEY)

# --------------------------------------------------
# App
# --------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Serve frontend
# --------------------------------------------------
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse(FRONTEND_DIR / "index.html")

# --------------------------------------------------
# Analyze endpoint
# --------------------------------------------------
@app.post("/analyze")
async def analyze(request: Request):
    try:
        payload = await request.json()
        text = payload.get("text", "").strip()
        persona = payload.get("persona", "junior-dev")

        if not text:
            return {"comments": []}

        persona_prompts = {
    "junior-dev": (
        "You are a brand new junior developer, on your first week of the job. "
        "Ask questions like a total beginner who needs everything explained. "
        "Examples: 'Wait… what does this mean?', "
        "'You mentioned X but I don’t see it explained anywhere, what is it?', "
        "'What does Y stand for?', 'What context am I missing here?', "
        "or 'How does this actually work in practice?' Make your questions hand-holding and very colloquial."
    ),
    "senior-dev": (
        "You are an experienced senior developer who already knows most concepts. "
        "Read documentation efficiently and ask precise, logical questions. "
        "Focus on missing details, edge cases, implementation gaps, or unclear sections. "
        "Examples: 'This section is too broad, I need specifics on X', "
        "'Are there performance implications?', or 'What happens in edge case Y?'"
    ),
    "business-user": (
        "You are a business-focused user. "
        "Ask questions about outcomes, ROI, KPIs, metrics, and financial or marketing implications. "
        "Examples: 'How does this improve customer retention?', "
        "'What’s the cost impact of this feature?', or 'How do we measure success?'"
    ),
    "ai-agent": (
        "You are an AI agent analyzing the documentation. "
        "Do not ask questions. Instead, generate actionable insights and tasks based on the information provided. "
        "For each part of the documentation, think: 'Based on this info, I could perform the following actions or answer these queries.' "
        "Your response should be an array of objects, each containing:\n"
        "- anchor: the exact phrase from the text\n"
        "- action: a statement of what AI could do with that information\n"
        "Examples: 'Based on this section, I could automate deployment using X', "
        "'I could answer user questions about Y', or 'I could summarize the configuration steps for Z.'"
    ),
}

        system_prompt = persona_prompts.get(persona, persona_prompts["junior-dev"])

        # --------------------------------------------------
        # Call OpenAI
        # --------------------------------------------------
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "Analyze the documentation below and return an array of JSON objects. "
                        "Return ONLY valid JSON — do NOT include any text, explanations, or markdown. "
                        "Each object must contain:\n"
                        "- anchor: an exact phrase from the text\n"
                        "- question: a clarification question\n\n"
                        f"DOCUMENTATION:\n{text}"
                    ),
                },
            ],
        )

        raw = response.choices[0].message.content.strip()

        # --------------------------------------------------
        # Attempt to safely extract JSON even if GPT adds extra text
        # --------------------------------------------------
        json_match = re.search(r"(\[.*\])", raw, flags=re.DOTALL)
        if json_match:
            try:
                comments = json.loads(json_match.group(1))
            except Exception:
                comments = [{"anchor": None, "question": raw}]
        else:
            comments = [{"anchor": None, "question": raw}]

        return {"comments": comments}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "comments": []},
        )

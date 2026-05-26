from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from pathlib import Path
import os
import json
import logging
import re
from anthropic import Anthropic

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

app = FastAPI(title="Prepora.ai Backend")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def _extract_json(text: str) -> Any:
    """Extract JSON from Claude's text response. Strips code fences if present."""
    if not text:
        raise ValueError("Empty response from Claude")
    text = text.strip()
    # strip ```json fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    # try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # try to find json object
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        return json.loads(m.group(0))
    raise ValueError(f"Could not parse JSON. Raw: {text[:500]}")


def _call_claude(system: str, user: str, max_tokens: int = 4096) -> Any:
    if not anthropic_client:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    try:
        msg = anthropic_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = msg.content[0].text
        return _extract_json(text)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Claude call failed")
        raise HTTPException(status_code=502, detail=f"Claude error: {str(e)[:300]}")


# -------------- Schemas --------------
class AnalyzeContentReq(BaseModel):
    text: str
    childContext: Optional[Dict[str, Any]] = None


class GenerateQuestionsReq(BaseModel):
    content: str
    subject: Optional[str] = None
    klass: Optional[str] = Field(default=None, alias="class")
    chapter: Optional[str] = None
    difficulty: Optional[str] = "Medium"
    count: int = 10
    types: List[str] = ["MCQ"]

    class Config:
        populate_by_name = True


class EvaluateSubjectiveReq(BaseModel):
    question: str
    modelAnswer: str
    keywords: List[str] = []
    studentAnswer: str
    marks: int = 5


class GenerateNotesReq(BaseModel):
    content: str
    subject: Optional[str] = None
    chapter: Optional[str] = None


class PeerAnalysisReq(BaseModel):
    studentName: str
    klass: str = Field(alias="class")
    school: str
    rank: int
    totalStudents: int
    percentile: float
    accuracy: float
    classAvg: float
    topScore: float
    subjects: List[Dict[str, Any]] = []
    practice: Dict[str, Any] = {}

    class Config:
        populate_by_name = True


# -------------- Endpoints --------------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "Prepora.ai backend"}


@api_router.get("/health")
async def health():
    return {"status": "healthy", "claude_configured": bool(anthropic_client)}


@api_router.post("/claude/analyze-content")
async def analyze_content(req: AnalyzeContentReq):
    system = (
        "You are an expert educational content analyzer for Indian school curriculum "
        "(CBSE/ICSE/State/IB/IGCSE) and competitive exams (JEE/NEET/UPSC/CAT). "
        "Return ONLY valid JSON, no markdown, no preamble."
    )
    ctx = f"Child context: {json.dumps(req.childContext)}\n\n" if req.childContext else ""
    user = (
        f"{ctx}Analyze this study material:\n\"\"\"\n{req.text[:8000]}\n\"\"\"\n\n"
        "Return JSON with shape: {\n"
        "  \"subject\": string,\n"
        "  \"class\": string,\n"
        "  \"board\": string,\n"
        "  \"chapter\": string,\n"
        "  \"topics\": [string],\n"
        "  \"difficulty\": \"Easy\"|\"Medium\"|\"Hard\",\n"
        "  \"bloomLevel\": string,\n"
        "  \"suggestedQuestionTypes\": [\"MCQ\"|\"Fill Blanks\"|\"True/False\"|\"Short Answer\"|\"Long Answer\"|\"Match Following\"|\"Flashcards\"],\n"
        "  \"contentSummary\": string\n"
        "}"
    )
    return _call_claude(system, user, max_tokens=2000)


@api_router.post("/claude/generate-questions")
async def generate_questions(req: GenerateQuestionsReq):
    system = (
        "You are an expert exam paper setter for Indian school curriculum. "
        "Generate age-appropriate questions following CBSE/ICSE patterns. "
        "Return ONLY valid JSON, no markdown."
    )
    types_str = ", ".join(req.types) if req.types else "MCQ"
    user = (
        f"Generate {req.count} questions from the following content:\n\"\"\"\n{req.content[:10000]}\n\"\"\"\n\n"
        f"Subject: {req.subject or 'General'}\n"
        f"Class: {req.klass or 'General'}\n"
        f"Chapter: {req.chapter or 'General'}\n"
        f"Difficulty: {req.difficulty}\n"
        f"Types: {types_str}\n\n"
        "Return JSON shape: {\n"
        "  \"title\": string,\n"
        "  \"subject\": string,\n"
        "  \"class\": string,\n"
        "  \"chapter\": string,\n"
        "  \"difficulty\": string,\n"
        "  \"totalMarks\": number,\n"
        "  \"questions\": [{\n"
        "    \"id\": string,\n"
        "    \"type\": \"MCQ\"|\"Fill Blanks\"|\"True/False\"|\"Short Answer\"|\"Long Answer\"|\"Match Following\"|\"Flashcards\",\n"
        "    \"question\": string,\n"
        "    \"options\": [string] (MCQ only),\n"
        "    \"answer\": string|number,\n"
        "    \"explanation\": string,\n"
        "    \"marks\": number,\n"
        "    \"bloomLevel\": string,\n"
        "    \"concept\": string,\n"
        "    \"pairs\": [{\"left\":string,\"right\":string}] (Match only),\n"
        "    \"keywords\": [string] (subjective only),\n"
        "    \"front\": string (Flashcard only),\n"
        "    \"back\": string (Flashcard only)\n"
        "  }]\n}"
    )
    return _call_claude(system, user, max_tokens=8000)


@api_router.post("/claude/evaluate-subjective")
async def evaluate_subjective(req: EvaluateSubjectiveReq):
    system = (
        "You are a fair school examiner. "
        "Evaluate student answers constructively and supportively. "
        "Return ONLY valid JSON."
    )
    user = (
        f"Question: {req.question}\n"
        f"Model Answer: {req.modelAnswer}\n"
        f"Keywords: {', '.join(req.keywords)}\n"
        f"Student Answer: {req.studentAnswer}\n"
        f"Total Marks: {req.marks}\n\n"
        "Return JSON: {\n"
        "  \"marksAwarded\": number,\n"
        "  \"totalMarks\": number,\n"
        "  \"percentage\": number,\n"
        "  \"feedback\": string,\n"
        "  \"missingConcepts\": [string],\n"
        "  \"correctPoints\": [string],\n"
        "  \"improvements\": [string]\n}"
    )
    return _call_claude(system, user, max_tokens=1500)


@api_router.post("/claude/generate-notes")
async def generate_notes(req: GenerateNotesReq):
    system = (
        "You generate concise revision notes and flashcards from study material. "
        "Return ONLY valid JSON."
    )
    user = (
        f"Content:\n\"\"\"\n{req.content[:10000]}\n\"\"\"\n\n"
        f"Subject: {req.subject or 'General'}\n"
        f"Chapter: {req.chapter or 'General'}\n\n"
        "Return JSON: {\n"
        "  \"summary\": string,\n"
        "  \"keyPoints\": [string],\n"
        "  \"flashcards\": [{\"front\":string,\"back\":string}],\n"
        "  \"importantTerms\": [{\"term\":string,\"definition\":string}]\n}"
    )
    return _call_claude(system, user, max_tokens=3000)


@api_router.post("/claude/peer-analysis")
async def peer_analysis(req: PeerAnalysisReq):
    system = (
        "You are a supportive academic coach. Give encouraging, specific, actionable feedback. "
        "Never be discouraging. Return ONLY valid JSON."
    )
    user = (
        f"Student: {req.studentName}\n"
        f"Class: {req.klass}\n"
        f"School: {req.school}\n"
        f"Rank: {req.rank}/{req.totalStudents}\n"
        f"Percentile: {req.percentile}%\n"
        f"Accuracy: {req.accuracy}% | Class Avg: {req.classAvg}% | Top: {req.topScore}%\n"
        f"Subjects: {json.dumps(req.subjects)}\n"
        f"Practice: {json.dumps(req.practice)}\n\n"
        "Return JSON: {\n"
        "  \"rankSummary\": string,\n"
        "  \"overallFeedback\": string,\n"
        "  \"subjectFeedback\": [{\"subject\":string,\"status\":string,\"gap\":number,\"feedback\":string,\"actionItems\":[string],\"rankImpact\":string}],\n"
        "  \"topPriorityAction\": string,\n"
        "  \"studyHabitInsights\": string,\n"
        "  \"weeklyChallenge\": string,\n"
        "  \"motivationalMessage\": string,\n"
        "  \"projectedRank\": {\"currentPace\":number,\"withFocusPlan\":number,\"improvement\":number}\n}"
    )
    return _call_claude(system, user, max_tokens=2500)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

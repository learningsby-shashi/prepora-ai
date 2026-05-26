"""
Prepora.ai POC Test Script
Validates:
1) Supabase DB connection and required tables exist
2) Supabase Storage bucket 'prepora-uploads' exists
3) Anthropic Claude API works end-to-end with JSON response
"""
import os
import sys
import json
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

print("=" * 60)
print("Prepora.ai — POC Test Script")
print("=" * 60)
print(f"SUPABASE_URL: {SUPABASE_URL[:40]}...")
print(f"SUPABASE_ANON_KEY: {SUPABASE_ANON_KEY[:20]}...")
print(f"ANTHROPIC_API_KEY: {ANTHROPIC_API_KEY[:20]}...")
print()

passed = 0
failed = 0


def check(label, fn):
    global passed, failed
    print(f"[TEST] {label} ... ", end="", flush=True)
    try:
        fn()
        passed += 1
        print("PASS")
    except Exception as e:
        failed += 1
        print(f"FAIL — {type(e).__name__}: {e}")


# -------- 1. Supabase DB --------
def test_supabase_tables():
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    tables = [
        "parents", "children", "uploaded_materials", "question_banks",
        "practice_sessions", "weak_concepts", "peer_benchmark_pool",
        "rank_history", "achievements", "revision_notes", "revision_plans"
    ]
    found = []
    missing = []
    for t in tables:
        try:
            client.table(t).select("*").limit(1).execute()
            found.append(t)
        except Exception as e:
            missing.append((t, str(e)[:80]))
    print()
    for t in found:
        print(f"    ✓ {t}")
    for t, err in missing:
        print(f"    ✗ {t} — {err}")
    if missing:
        raise Exception(f"{len(missing)} tables missing/unreachable")


# -------- 2. Supabase Storage --------
def test_supabase_storage():
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    # anon key may not have list-buckets permission. Try direct access.
    files = client.storage.from_("prepora-uploads").list()
    print()
    print(f"    Bucket 'prepora-uploads' accessible, files: {len(files)}")


# -------- 3. Claude API --------
def test_claude():
    from anthropic import Anthropic
    a = Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = a.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=512,
        system="You are an educational content analyzer. Return ONLY valid JSON, no markdown fences.",
        messages=[{
            "role": "user",
            "content": "Analyze: 'Photosynthesis converts light energy into chemical energy.' Return: {subject, topics: [], difficulty}"
        }]
    )
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    parsed = json.loads(text)
    print()
    print(f"    Claude response: {json.dumps(parsed)[:120]}...")
    assert "subject" in parsed, "missing 'subject' in JSON"


check("Supabase tables", test_supabase_tables)
check("Supabase storage bucket", test_supabase_storage)
check("Anthropic Claude API", test_claude)

print()
print("=" * 60)
print(f"RESULT: {passed} passed, {failed} failed")
print("=" * 60)
sys.exit(0 if failed == 0 else 1)

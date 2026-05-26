import requests
import sys
import json
from datetime import datetime

class BackendAPITester:
    def __init__(self, base_url="https://peer-benchmark-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    resp_json = response.json()
                    print(f"   Response preview: {json.dumps(resp_json, indent=2)[:300]}...")
                    return True, resp_json
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:500]
                })
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            self.failed_tests.append({"test": name, "error": "Timeout"})
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({"test": name, "error": str(e)})
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        if success:
            if response.get('claude_configured') == True:
                print("   ✓ Claude is configured")
            else:
                print("   ⚠ Claude is NOT configured")
        return success

    def test_analyze_content(self):
        """Test analyze-content endpoint"""
        sample_text = """
        Chapter 5: Photosynthesis
        
        Photosynthesis is the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water. 
        It occurs in the chloroplasts of plant cells. The process can be divided into two stages: light-dependent reactions 
        and light-independent reactions (Calvin cycle). The overall equation is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2.
        
        Key concepts:
        - Chlorophyll absorbs light energy
        - Light reactions produce ATP and NADPH
        - Calvin cycle fixes carbon dioxide
        - Oxygen is released as a byproduct
        """
        
        success, response = self.run_test(
            "Analyze Content",
            "POST",
            "api/claude/analyze-content",
            200,
            data={"text": sample_text, "childContext": {"class": "Class 10", "board": "CBSE"}},
            timeout=60
        )
        if success:
            required_fields = ['subject', 'topics', 'difficulty']
            missing = [f for f in required_fields if f not in response]
            if missing:
                print(f"   ⚠ Missing fields: {missing}")
            else:
                print(f"   ✓ All required fields present")
        return success

    def test_generate_questions(self):
        """Test generate-questions endpoint"""
        sample_content = """
        Newton's Laws of Motion:
        1. First Law (Inertia): An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.
        2. Second Law: F = ma (Force equals mass times acceleration)
        3. Third Law: For every action, there is an equal and opposite reaction.
        """
        
        success, response = self.run_test(
            "Generate Questions",
            "POST",
            "api/claude/generate-questions",
            200,
            data={
                "content": sample_content,
                "subject": "Physics",
                "class": "Class 9",
                "chapter": "Laws of Motion",
                "difficulty": "Medium",
                "count": 5,
                "types": ["MCQ"]
            },
            timeout=120
        )
        if success:
            if 'questions' in response and isinstance(response['questions'], list):
                print(f"   ✓ Generated {len(response['questions'])} questions")
            else:
                print(f"   ⚠ No questions array in response")
        return success

    def test_evaluate_subjective(self):
        """Test evaluate-subjective endpoint"""
        success, response = self.run_test(
            "Evaluate Subjective Answer",
            "POST",
            "api/claude/evaluate-subjective",
            200,
            data={
                "question": "Explain the process of photosynthesis.",
                "modelAnswer": "Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in chloroplasts and involves light-dependent and light-independent reactions.",
                "keywords": ["chloroplast", "light energy", "chemical energy", "carbon dioxide", "oxygen"],
                "studentAnswer": "Plants use sunlight to make food. They take in carbon dioxide and release oxygen.",
                "marks": 5
            },
            timeout=60
        )
        if success:
            required_fields = ['marksAwarded', 'feedback']
            missing = [f for f in required_fields if f not in response]
            if missing:
                print(f"   ⚠ Missing fields: {missing}")
            else:
                print(f"   ✓ Marks awarded: {response.get('marksAwarded')}/{response.get('totalMarks')}")
        return success

    def test_generate_notes(self):
        """Test generate-notes endpoint"""
        sample_content = """
        The Water Cycle
        
        The water cycle describes how water evaporates from the surface of the earth, rises into the atmosphere, 
        cools and condenses into clouds, and falls back to the surface as precipitation. The water that falls to 
        Earth as precipitation either evaporates, is taken up by plants, or becomes runoff. Runoff flows into rivers, 
        lakes, and oceans, where it can evaporate and begin the cycle again.
        """
        
        success, response = self.run_test(
            "Generate Notes",
            "POST",
            "api/claude/generate-notes",
            200,
            data={
                "content": sample_content,
                "subject": "Science",
                "chapter": "Water Cycle"
            },
            timeout=90
        )
        if success:
            required_fields = ['summary', 'keyPoints', 'flashcards']
            missing = [f for f in required_fields if f not in response]
            if missing:
                print(f"   ⚠ Missing fields: {missing}")
            else:
                print(f"   ✓ Generated {len(response.get('flashcards', []))} flashcards")
        return success

    def test_peer_analysis(self):
        """Test peer-analysis endpoint"""
        success, response = self.run_test(
            "Peer Analysis",
            "POST",
            "api/claude/peer-analysis",
            200,
            data={
                "studentName": "Test Student",
                "class": "Class 8",
                "school": "Test School",
                "rank": 15,
                "totalStudents": 50,
                "percentile": 70.0,
                "accuracy": 75.5,
                "classAvg": 68.0,
                "topScore": 92.0,
                "subjects": [
                    {"subject": "Math", "accuracy": 80, "classAvg": 70, "gap": 10},
                    {"subject": "Science", "accuracy": 70, "classAvg": 65, "gap": 5}
                ],
                "practice": {"totalSessions": 10, "avgDuration": 25}
            },
            timeout=90
        )
        if success:
            required_fields = ['rankSummary', 'subjectFeedback']
            missing = [f for f in required_fields if f not in response]
            if missing:
                print(f"   ⚠ Missing fields: {missing}")
            else:
                print(f"   ✓ All required fields present")
        return success

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print(f"📊 BACKEND TEST SUMMARY")
        print("="*60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for fail in self.failed_tests:
                print(f"  - {fail.get('test', 'Unknown')}: {fail.get('error', fail.get('response', 'Unknown error'))[:100]}")
        
        print("="*60)
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    print("🚀 Starting Prepora.ai Backend API Tests")
    print("="*60)
    
    tester = BackendAPITester()
    
    # Run all tests
    tester.test_health()
    tester.test_analyze_content()
    tester.test_generate_questions()
    tester.test_evaluate_subjective()
    tester.test_generate_notes()
    tester.test_peer_analysis()
    
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())

import json
import uuid
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.candidate import Candidate, CandidateStage
from app.repositories.candidate_repo import CandidateRepository
from app.services.screening.ats_intelligence import score_resume_enterprise
from app.services.screening.keyword_engine import (
    extract_keywords,
    extract_skills_categorized,
    calculate_keyword_overlap,
    get_missing_keywords,
    get_matched_keywords,
)
from app.services.stage_service import StageService

# Pre-configured Industry Job Descriptions for Quick Selection
PRESET_JOB_DESCRIPTIONS: Dict[str, Dict[str, Any]] = {
    "Frontend Developer": {
        "title": "Frontend Developer",
        "description": """We are looking for a Frontend Developer proficient in React, TypeScript, Next.js, and modern CSS frameworks like Tailwind CSS.
Requirements:
- 2+ years experience building responsive, high-performance web applications with React and TypeScript.
- Strong knowledge of state management, RESTful APIs, HTML5, CSS3, modern JavaScript (ES6+), and browser performance optimization.
- Experience with Git, testing frameworks (Jest/Vitest), component libraries, and CI/CD pipelines.
- Nice to have: GraphQL, Next.js SSR/SSG, Docker, accessibility standards (a11y).""",
        "default_threshold": 60.0,
    },
    "Backend Developer": {
        "title": "Backend Developer",
        "description": """Seeking a Backend Engineer to build robust, scalable microservices and APIs with Python (FastAPI/Django) or Node.js.
Requirements:
- Strong experience with Python, FastAPI, Django, or Node.js building RESTful APIs and microservices.
- Solid database design and query optimization skills with PostgreSQL, MySQL, Redis, or MongoDB.
- Experience with asynchronous programming, Docker, SQLAlchemy/ORMs, JWT authentication, and automated testing.
- Nice to have: Kubernetes, AWS/GCP, Celery, Kafka/RabbitMQ, system design.""",
        "default_threshold": 60.0,
    },
    "Full Stack Developer": {
        "title": "Full Stack Developer",
        "description": """Looking for a Full Stack Developer capable of delivering end-to-end features using React, TypeScript, Node.js or Python, and relational databases.
Requirements:
- Proficiency in React, TypeScript, Tailwind CSS on the frontend.
- Backend expertise in Node.js, Express, Python, or FastAPI with REST APIs.
- Hands-on experience with SQL databases (PostgreSQL/MySQL), Git, Docker, and cloud deployments.
- Understanding of web security, authentication, system architecture, and automated testing.""",
        "default_threshold": 65.0,
    },
    "Data Scientist / AI Engineer": {
        "title": "Data Scientist / AI Engineer",
        "description": """Hiring a Data Scientist / AI Engineer to build machine learning models, RAG pipelines, and predictive algorithms.
Requirements:
- Strong programming in Python, Pandas, NumPy, Scikit-learn, and PyTorch or TensorFlow.
- Experience with natural language processing (NLP), Large Language Models (LLMs), embeddings, and RAG architectures.
- Experience with SQL, data pipelines, model evaluation, and deployment using FastAPI or Docker.
- Nice to have: LangChain, vector databases (Pinecone, ChromaDB, Weaviate), cloud ML platforms (AWS SageMaker, GCP Vertex AI).""",
        "default_threshold": 65.0,
    },
    "DevOps & Cloud Engineer": {
        "title": "DevOps & Cloud Engineer",
        "description": """Seeking a DevOps & Cloud Infrastructure Engineer to manage cloud platforms, automation, and CI/CD pipelines.
Requirements:
- Strong hands-on experience with AWS or GCP cloud services, Linux administration, and Bash scripting.
- Deep expertise in Docker, Kubernetes, Helm, and container orchestration.
- Experience writing Infrastructure as Code using Terraform or Ansible.
- Strong understanding of CI/CD pipelines (GitHub Actions, Jenkins, GitLab CI), monitoring (Prometheus, Grafana, Datadog), and cloud security.""",
        "default_threshold": 65.0,
    },
}


class ScreeningService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.candidate_repo = CandidateRepository(session)
        self.stage_service = StageService(session)

    @staticmethod
    def get_presets() -> List[Dict[str, Any]]:
        """Returns pre-configured role job descriptions."""
        return [
            {
                "role": key,
                "title": data["title"],
                "description": data["description"],
                "default_threshold": data["default_threshold"],
            }
            for key, data in PRESET_JOB_DESCRIPTIONS.items()
        ]

    @staticmethod
    def evaluate_screening(
        resume_text: str,
        jd_text: str,
        threshold: float = 60.0,
        required_keywords: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates candidate resume text against a job description.
        Returns match score (0-100), decision ('ACCEPT' or 'REJECT'),
        matched keywords, missing keywords, categorized skills, and explanation.
        """
        if not jd_text.strip():
            raise ValueError("Job description cannot be empty for screening.")

        resume_clean = (resume_text or "").strip()
        resume_kws = extract_keywords(resume_clean) if resume_clean else []
        jd_kws = extract_keywords(jd_text)

        # Append explicitly required keywords if provided
        if required_keywords:
            for kw in required_keywords:
                clean_kw = kw.strip().lower()
                if clean_kw and clean_kw not in jd_kws:
                    jd_kws.append(clean_kw)

        # Compute multi-dimensional enterprise evaluation
        intelligence = score_resume_enterprise(
            resume_text=resume_clean,
            job_title="",
            required_skills=required_keywords or jd_kws[:8],
            job_description=jd_text
        )

        # Merge TF-IDF score with enterprise weighted overall score
        tfidf_score = calculate_keyword_overlap(resume_kws, jd_kws) if resume_kws else 0.0
        intel_score = float(intelligence["overall_score"])
        score = round((tfidf_score * 0.4) + (intel_score * 0.6), 1) if resume_clean else 0.0

        # Extract matched and missing
        matched = get_matched_keywords(resume_kws, jd_kws) if resume_kws else []
        missing = get_missing_keywords(resume_kws, jd_kws)
        categorized_skills = extract_skills_categorized(resume_clean) if resume_clean else {}

        # Hard criteria check for critical missing keywords
        critical_missing = intelligence.get("critical_missing") or missing.get("critical", [])
        has_excessive_critical_gaps = len(critical_missing) >= 4 and len(matched) < 2

        is_accepted = (score >= threshold) and not has_excessive_critical_gaps
        decision = "ACCEPT" if is_accepted else "REJECT"

        # Generate human-readable reason
        if is_accepted:
            reason = (
                f"Candidate achieved {score:.1f}% composite match (exceeds {threshold:.1f}% threshold). "
                f"Demonstrated core competencies: {', '.join(matched[:5]) if matched else 'Profile skills aligned'}."
            )
            recommendation = "Advance to Screening"
        else:
            if not resume_clean:
                reason = "No resume or detailed technical background attached to evaluate."
            elif has_excessive_critical_gaps:
                reason = (
                    f"Match score {score:.1f}% with critical technical gaps: {', '.join(critical_missing[:4])}."
                )
            else:
                reason = (
                    f"Candidate scored {score:.1f}%, falling below the required {threshold:.1f}% threshold. "
                    f"Missing required keywords: {', '.join(critical_missing[:3]) if critical_missing else 'Core technical skills'}."
                )
            recommendation = "Reject / Archive application"

        return {
            "score": score,
            "threshold": threshold,
            "decision": decision,
            "is_accepted": is_accepted,
            "recommendation": recommendation,
            "summary_reason": reason,
            "matched_keywords": matched,
            "missing_keywords": missing,
            "categorized_skills": categorized_skills,
            "total_keywords_jd": len(set(jd_kws)),
            "total_keywords_resume": len(set(resume_kws)),
            "breakdown": intelligence.get("breakdown"),
            "critical_matched": intelligence.get("critical_matched"),
            "critical_missing": intelligence.get("critical_missing"),
            "important_matched": intelligence.get("important_matched"),
            "important_missing": intelligence.get("important_missing"),
            "achievements_detected": intelligence.get("achievements_detected"),
            "suggestions": intelligence.get("suggestions"),
        }

    async def screen_candidate(
        self,
        candidate_id: uuid.UUID,
        user_id: uuid.UUID,
        jd_text: str,
        threshold: float = 60.0,
        auto_apply: bool = False,
    ) -> Dict[str, Any]:
        """
        Screens an individual candidate by UUID against a Job Description.
        Persists match score & details to the candidate record.
        If auto_apply is True, updates candidate stage to 'screening' or 'rejected'.
        """
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")

        # Synthesize resume text from resume_text field or candidate skills & role
        resume_text = candidate.resume_text or ""
        if not resume_text:
            skills_str = ", ".join(candidate.skills) if candidate.skills else ""
            experience_str = f"{candidate.experience_years} years experience" if candidate.experience_years else ""
            resume_text = f"Role: {candidate.applied_role}\nSkills: {skills_str}\nExperience: {experience_str}"

        eval_result = self.evaluate_screening(resume_text, jd_text, threshold)

        # Update candidate match score and details in database
        candidate.match_score = eval_result["score"]
        candidate.match_details = json.dumps({
            "score": eval_result["score"],
            "decision": eval_result["decision"],
            "threshold": eval_result["threshold"],
            "summary": eval_result["summary_reason"],
            "matched": eval_result["matched_keywords"][:10],
            "missing_critical": eval_result["missing_keywords"].get("critical", [])[:5],
            "breakdown": eval_result.get("breakdown"),
            "critical_matched": eval_result.get("critical_matched"),
            "critical_missing": eval_result.get("critical_missing"),
            "important_matched": eval_result.get("important_matched"),
            "important_missing": eval_result.get("important_missing"),
            "achievements_detected": eval_result.get("achievements_detected"),
            "suggestions": eval_result.get("suggestions"),
        })

        # Apply automated decision if requested
        new_stage: Optional[CandidateStage] = None
        if auto_apply:
            if eval_result["is_accepted"]:
                # Only transition if currently in APPLIED
                if candidate.current_stage == CandidateStage.APPLIED:
                    new_stage = CandidateStage.SCREENING
                    await self.stage_service.change_stage(
                        candidate_id=candidate.id,
                        to_stage=CandidateStage.SCREENING,
                        user_id=user_id,
                        reason=f"Accepted via Screening: {eval_result['summary_reason']}",
                    )
            else:
                # Transition to rejected if not already hired or rejected
                if candidate.current_stage not in (CandidateStage.HIRED, CandidateStage.REJECTED):
                    new_stage = CandidateStage.REJECTED
                    await self.stage_service.change_stage(
                        candidate_id=candidate.id,
                        to_stage=CandidateStage.REJECTED,
                        user_id=user_id,
                        reason=f"Rejected via Screening: {eval_result['summary_reason']}",
                    )

        await self.session.commit()
        await self.session.refresh(candidate)

        eval_result["candidate_id"] = str(candidate.id)
        eval_result["candidate_name"] = candidate.full_name
        eval_result["current_stage"] = candidate.current_stage.value
        eval_result["auto_applied_stage"] = new_stage.value if new_stage else None

        return eval_result

    async def batch_screen_candidates(
        self,
        candidate_ids: List[uuid.UUID],
        user_id: uuid.UUID,
        jd_text: str,
        threshold: float = 60.0,
        auto_apply: bool = False,
    ) -> Dict[str, Any]:
        """
        Batch screens multiple candidates against a job description.
        Optionally applies automatic Acceptance (to Screening) or Rejection.
        """
        results = []
        accepted_count = 0
        rejected_count = 0

        for cid in candidate_ids:
            try:
                res = await self.screen_candidate(
                    candidate_id=cid,
                    user_id=user_id,
                    jd_text=jd_text,
                    threshold=threshold,
                    auto_apply=auto_apply,
                )
                if res["is_accepted"]:
                    accepted_count += 1
                else:
                    rejected_count += 1
                results.append(res)
            except Exception as e:
                results.append({
                    "candidate_id": str(cid),
                    "error": str(e),
                    "is_accepted": False,
                    "score": 0.0,
                })

        return {
            "total_screened": len(candidate_ids),
            "accepted_count": accepted_count,
            "rejected_count": rejected_count,
            "threshold": threshold,
            "auto_applied": auto_apply,
            "results": results,
        }

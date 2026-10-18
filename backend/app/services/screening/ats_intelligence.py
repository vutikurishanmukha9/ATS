"""
Enterprise ATS Intelligence Engine
Derived from AI Resume Analyzer (Resume_App) multi-factor scoring methodology.
Provides section detection, quantified achievement parsing, critical skill classification,
multi-dimensional sub-scores (0-100), and prioritized actionable suggestions.
"""

import re
from typing import Any


SECTION_HEADERS = {
    'experience': ['experience', 'work experience', 'employment', 'professional experience', 'work history'],
    'education': ['education', 'academic', 'qualifications', 'degree'],
    'skills': ['skills', 'technical skills', 'core competencies', 'technologies', 'tools', 'proficiencies'],
    'projects': ['projects', 'personal projects', 'key projects', 'portfolio'],
    'summary': ['summary', 'profile', 'about', 'professional summary', 'objective'],
    'certifications': ['certifications', 'certificates', 'credentials', 'licenses'],
    'achievements': ['achievements', 'accomplishments', 'awards', 'honors'],
}

ACTION_VERBS = [
    'achieved', 'improved', 'reduced', 'increased', 'built', 'developed',
    'created', 'designed', 'implemented', 'launched', 'led', 'managed',
    'delivered', 'optimized', 'automated', 'scaled', 'saved', 'generated',
    'streamlined', 'transformed', 'accelerated', 'enhanced', 'deployed', 'orchestrated'
]

TECH_SKILLS_CATALOG = {
    'languages': ['python', 'typescript', 'javascript', 'java', 'golang', 'c++', 'c#', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql'],
    'frameworks': ['react', 'next.js', 'vue', 'angular', 'node.js', 'fastapi', 'django', 'flask', 'express', 'spring boot', 'graphql', 'tailwind'],
    'cloud_devops': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'helm', 'ansible', 'jenkins', 'git', 'linux', 'kafka'],
    'data_ai': ['machine learning', 'deep learning', 'pytorch', 'tensorflow', 'pandas', 'numpy', 'scikit-learn', 'nlp', 'llm', 'rag', 'spark'],
    'databases': ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'sqlite', 'cassandra'],
    'architecture': ['microservices', 'rest api', 'distributed systems', 'system design', 'event-driven', 'oop', 'domain-driven design']
}

EDUCATION_LEVELS = {
    'phd': ['phd', 'ph.d', 'doctorate'],
    'masters': ["master's", 'master of science', 'm.s.', 'mtech', 'm.tech', 'mba', 'msc'],
    'bachelors': ["bachelor's", 'bachelor of engineering', 'b.e.', 'b.tech', 'btech', 'b.s.', 'bsc', 'bca', 'undergraduate']
}


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    return re.sub(r'\s+', ' ', text).strip()


def detect_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    text_lower = text.lower()
    header_positions = []

    for section_type, headers in SECTION_HEADERS.items():
        for header in headers:
            pattern = rf'(?:^|\n)\s*({re.escape(header)})\s*[:\n]'
            for match in re.finditer(pattern, text_lower, re.IGNORECASE):
                header_positions.append({
                    'type': section_type,
                    'start': match.end(),
                    'header_start': match.start()
                })

    header_positions.sort(key=lambda x: x['start'])

    for i, hp in enumerate(header_positions):
        start = hp['start']
        end = header_positions[i + 1]['header_start'] if i + 1 < len(header_positions) else len(text)
        content = text[start:end].strip()
        if content and hp['type'] not in sections:
            sections[hp['type']] = content

    return sections


def extract_quantified_achievements(text: str) -> list[dict[str, Any]]:
    achievements = []
    clauses = re.split(r'[\n•;.]', text)

    for raw_clause in clauses:
        clause = raw_clause.strip()
        if len(clause) < 18 or len(clause) > 250:
            continue

        clause_lower = clause.lower().lstrip('-*• ')
        matched_verb = next((v for v in ACTION_VERBS if clause_lower.startswith(v) or f" {v} " in clause_lower[:35]), None)

        if not matched_verb:
            continue

        metric_type = None
        if re.search(r'\b\d+(?:\.\d+)?\s*%', clause):
            metric_type = "percentage"
        elif re.search(r'[\$€£₹]\s*\d+|\b\d+\s*(?:k|m|million|thousand|crore|lakh)\b', clause, re.IGNORECASE):
            metric_type = "currency_financial"
        elif re.search(r'\b\d+\+?\s*(?:users|clients|rps|ms|seconds|reqs|events|nodes|teams|projects)\b', clause, re.IGNORECASE):
            metric_type = "scale_latency"

        if metric_type:
            achievements.append({
                'clause': clause,
                'verb': matched_verb,
                'metric_type': metric_type
            })

    return achievements[:8]


def extract_known_skills(text: str) -> list[str]:
    text_lower = normalize_text(text)
    detected = set()

    for category, skill_list in TECH_SKILLS_CATALOG.items():
        for skill in skill_list:
            escaped = re.escape(skill)
            if re.search(rf'\b{escaped}\b', text_lower):
                detected.add(skill)

    return sorted(detected)


def score_resume_enterprise(
    resume_text: str,
    job_title: str,
    required_skills: list[str],
    job_description: str
) -> dict[str, Any]:
    """
    Computes enterprise multi-dimensional ATS evaluation:
    Overall Score + 5 Component Sub-scores + Categorized Skills Matrix + Quantified Achievements + Actionable Advice.
    """
    if not resume_text or len(resume_text.strip()) < 20:
        return {
            'overall_score': 0,
            'breakdown': {
                'keywords': 0,
                'skills': 0,
                'experience': 0,
                'achievements': 0,
                'formatting': 0,
            },
            'critical_matched': [],
            'critical_missing': required_skills,
            'important_matched': [],
            'important_missing': [],
            'achievements_detected': [],
            'suggestions': [{'level': 'CRITICAL', 'text': 'Resume content is empty or unparseable. Please upload a valid resume text or PDF.'}]
        }

    resume_norm = normalize_text(resume_text)
    sections = detect_sections(resume_text)
    achievements = extract_quantified_achievements(resume_text)
    detected_skills = extract_known_skills(resume_text)

    # 1. Critical vs Important Skills Analysis
    critical_skills = [s.strip().lower() for s in required_skills if s.strip()]
    if not critical_skills:
        # Fallback from JD
        jd_skills = extract_known_skills(job_description)
        critical_skills = jd_skills[:6]

    critical_matched = [s for s in critical_skills if re.search(rf'\b{re.escape(s)}\b', resume_norm)]
    critical_missing = [s for s in critical_skills if s not in critical_matched]

    # Additional important skills from JD
    jd_all_skills = extract_known_skills(job_description)
    important_skills = [s for s in jd_all_skills if s not in critical_skills][:8]
    important_matched = [s for s in important_skills if re.search(rf'\b{re.escape(s)}\b', resume_norm)]
    important_missing = [s for s in important_skills if s not in important_matched]

    # 2. Sub-Score Calculations (0-100)
    # Skills Coverage Score
    if critical_skills:
        critical_ratio = len(critical_matched) / len(critical_skills)
        important_ratio = (len(important_matched) / len(important_skills)) if important_skills else 1.0
        skills_score = round((critical_ratio * 75) + (important_ratio * 25))
    else:
        skills_score = min(100, len(detected_skills) * 8)

    # Keywords Term Overlap Score
    keywords_found = len(critical_matched) + len(important_matched)
    total_target_keywords = max(1, len(critical_skills) + len(important_skills))
    keywords_score = min(100, round((keywords_found / total_target_keywords) * 100))

    # Experience & Seniority Score
    exp_years_match = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)', resume_norm)
    max_years = max([int(y) for y in exp_years_match], default=0) if exp_years_match else 0
    has_exp_section = 'experience' in sections
    experience_score = 40
    if has_exp_section:
        experience_score += 30
    if max_years >= 3:
        experience_score += 30
    elif max_years >= 1:
        experience_score += 20
    experience_score = min(100, experience_score)

    # Achievements Score (based on action verb + metrics)
    achievements_count = len(achievements)
    if achievements_count >= 4:
        achievements_score = 95
    elif achievements_count >= 2:
        achievements_score = 80
    elif achievements_count == 1:
        achievements_score = 65
    else:
        achievements_score = 35

    # Formatting & Structure Score
    formatting_score = 60
    if len(sections) >= 3:
        formatting_score += 25
    if '•' in resume_text or '-' in resume_text or '*' in resume_text:
        formatting_score += 15
    formatting_score = min(100, formatting_score)

    # 3. Overall Weighted Score
    # Weights: Skills (35%), Keywords (25%), Experience (20%), Achievements (10%), Formatting (10%)
    overall = round(
        (skills_score * 0.35) +
        (keywords_score * 0.25) +
        (experience_score * 0.20) +
        (achievements_score * 0.10) +
        (formatting_score * 0.10)
    )
    overall = max(10, min(99, overall))

    # 4. Actionable Enterprise Improvement Suggestions
    suggestions = []
    if critical_missing:
        missing_preview = ", ".join([f"'{s}'" for s in critical_missing[:4]])
        suggestions.append({
            'level': 'CRITICAL',
            'text': f"Target role requires core keywords missing from resume: {missing_preview}."
        })

    if achievements_score < 70:
        suggestions.append({
            'level': 'RECOMMENDED',
            'text': "Add quantified metrics (e.g., 'Reduced latency by 40%', 'Managed $250k budget') to your experience bullets."
        })

    if 'experience' not in sections:
        suggestions.append({
            'level': 'RECOMMENDED',
            'text': "Use standard section headers like 'Work Experience' or 'Professional Experience' for clean ATS parsing."
        })

    if formatting_score < 80:
        suggestions.append({
            'level': 'TIP',
            'text': "Ensure experience bullets use standard delimiter symbols and include dates in 'Month Year' format."
        })

    if not suggestions:
        suggestions.append({
            'level': 'TIP',
            'text': "Excellent alignment with role requirements and robust achievement indicators detected."
        })

    return {
        'overall_score': overall,
        'breakdown': {
            'keywords': keywords_score,
            'skills': skills_score,
            'experience': experience_score,
            'achievements': achievements_score,
            'formatting': formatting_score,
        },
        'critical_matched': critical_matched,
        'critical_missing': critical_missing,
        'important_matched': important_matched,
        'important_missing': important_missing,
        'achievements_detected': achievements,
        'detected_skills': detected_skills,
        'suggestions': suggestions
    }

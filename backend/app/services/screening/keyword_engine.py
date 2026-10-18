"""
Keyword Extraction and Matching Engine
Ported & optimized from Resume_App for ATS Screening.
Handles technical keyword extraction, n-grams, TF-IDF weighting,
skills categorization, and keyword overlap calculations.
"""

import re
from collections import Counter
from typing import Dict, List, Set, Any

STOP_WORDS: Set[str] = {
    # Articles / determiners
    'the', 'a', 'an', 'this', 'that', 'these', 'those',
    # Pronouns
    'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'its', 'we', 'us',
    'our', 'they', 'them', 'their', 'who', 'whom', 'what', 'which',
    # Prepositions / conjunctions
    'at', 'on', 'in', 'to', 'for', 'with', 'about', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down',
    'out', 'off', 'over', 'under', 'between', 'within', 'of', 'by',
    'or', 'and', 'but', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'along', 'among', 'around', 'upon', 'across', 'toward', 'towards',
    # Be / have / do / modals
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'has', 'have', 'had', 'having',
    'do', 'does', 'did', 'doing',
    'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could',
    # Adverbs / adjectives / fillers
    'not', 'no', 'very', 'too', 'also', 'just', 'only', 'more', 'most',
    'less', 'then', 'than', 'once', 'again', 'further', 'ever', 'never',
    'now', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'each', 'every', 'few', 'some', 'such', 'own', 'same', 'other',
    'well', 'much', 'even', 'still', 'already', 'often', 'always',
    # Generic resume / JD filler words
    'experience', 'experiences', 'years', 'year',
    'work', 'working', 'worked', 'works',
    'include', 'includes', 'including', 'included',
    'ensure', 'ensuring', 'ensured',
    'ability', 'able', 'capable',
    'strong', 'excellent', 'good', 'great', 'best', 'proven', 'adept',
    'skilled', 'proficient', 'demonstrated', 'hands',
    'required', 'preferred', 'must', 'desire', 'desired', 'ideal',
    'responsibilities', 'responsibility', 'requirements', 'requirement',
    'role', 'roles', 'position', 'job', 'company', 'organization', 'team',
    'looking', 'seeking', 'candidate', 'candidates',
    'application', 'apply', 'email', 'description', 'summary', 'overview',
    'knowledge', 'understanding', 'expertise',
    'new', 'using', 'used', 'use', 'uses',
    # Action verbs
    'create', 'creating', 'created', 'creation',
    'build', 'building', 'built',
    'develop', 'developing', 'developed', 'development',
    'manage', 'managing', 'managed', 'management',
    'deliver', 'delivering', 'delivered', 'delivery',
    'support', 'supporting', 'supported',
    'maintain', 'maintaining', 'maintained',
    'provide', 'providing', 'provided',
    'collaborate', 'collaborating', 'collaborated',
    'participate', 'participating', 'participated',
    'update', 'updating', 'updated',
    'enhance', 'enhancing', 'enhanced',
    'implement', 'implementing', 'implemented',
    'design', 'designing', 'designed',
    'contribute', 'contributing', 'contributed',
    'integrate', 'integrating', 'integrated',
    'optimize', 'optimizing', 'optimized',
    # Generic nouns / adjectives
    'high', 'low', 'large', 'small', 'end', 'multi', 'cross',
    'key', 'core', 'based', 'related', 'driven', 'native',
    'quality', 'solutions', 'solution', 'products', 'product',
    'clients', 'client', 'stakeholders', 'stakeholder',
    'effectively', 'efficiently', 'across', 'various',
    'robust', 'resilient', 'scalable', 'production',
    'systems', 'system', 'services', 'service',
    'frameworks', 'framework', 'tools', 'tool',
    'etc', 'per', 'via',
}

TECHNICAL_TERMS: Set[str] = {
    # Programming languages
    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'golang', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
    'pl/sql', 'sql', 'nosql', 'html', 'html5', 'css', 'css3', 'bash', 'shell',
    # Frameworks & libraries
    'react', 'reactjs', 'angular', 'vue', 'vuejs', 'nextjs', 'next.js', 'nuxt',
    'node', 'nodejs', 'node.js', 'express', 'expressjs', 'django', 'flask',
    'fastapi', 'spring', 'springboot', 'spring boot', 'rails', 'laravel', '.net', 'asp.net',
    'tensorflow', 'pytorch', 'keras', 'scikit', 'scikit-learn', 'pandas', 'numpy', 'opencv',
    'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'shadcn',
    'langchain', 'llamaindex',
    # Databases
    'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'elasticsearch', 'dynamodb',
    'oracle', 'cassandra', 'neo4j', 'sqlite', 'rds', 'snowflake', 'bigquery',
    'prisma', 'drizzle', 'sqlalchemy',
    # Cloud & DevOps
    'aws', 'azure', 'gcp', 'ec2', 's3', 'lambda', 'iam', 'vpc',
    'cloudformation', 'terraform', 'ansible', 'docker', 'kubernetes', 'k8s', 'helm',
    'nginx', 'jenkins', 'github', 'gitlab', 'bitbucket', 'ci/cd', 'cicd',
    # AI / ML / NLP
    'llm', 'llms', 'rag', 'embeddings', 'transformers', 'openai', 'claude', 'gemini', 'gpt',
    'bert', 'lstm', 'cnn', 'nlp', 'nlu', 'ner', 'genai', 'ai', 'ml',
    # Methodologies & Architecture
    'agile', 'scrum', 'kanban', 'devops', 'microservices', 'serverless', 'api', 'apis',
    'rest', 'restful', 'graphql', 'grpc', 'webhooks', 'websockets',
    'git', 'linux', 'unix', 'tdd', 'test-driven development',
    # Security & Monitoring
    'oauth', 'jwt', 'ssl', 'tls', 'encryption', 'datadog', 'prometheus', 'grafana',
}

IMPORTANT_BIGRAMS: Set[str] = {
    'machine learning', 'deep learning', 'data science', 'data analysis',
    'data engineering', 'data pipeline', 'data warehouse', 'data modeling',
    'project management', 'software development', 'web development',
    'full stack', 'front end', 'back end', 'cloud computing',
    'cloud infrastructure', 'artificial intelligence', 'natural language',
    'computer vision', 'system design', 'database management', 'version control',
    'continuous integration', 'continuous deployment', 'test driven',
    'object oriented', 'functional programming', 'agile methodology',
    'scrum master', 'ci cd', 'rest api', 'graphql api', 'microservices architecture',
    'prompt engineering', 'vector database', 'semantic search',
    'spring boot', 'tailwind css', 'next js', 'node js',
}

IMPORTANT_TRIGRAMS: Set[str] = {
    'machine learning engineer', 'full stack developer',
    'senior software engineer', 'natural language processing',
    'test driven development', 'object oriented programming',
    'amazon web services', 'google cloud platform',
    'large language models', 'retrieval augmented generation',
}


def clean_text_for_keywords(text: str) -> str:
    """Cleans text keeping letters, numbers, +, #, and /."""
    return re.sub(r'[^a-zA-Z0-9\s+#/.]', ' ', text.lower())


def extract_keywords(text: str, min_length: int = 2) -> List[str]:
    """Extracts meaningful individual keywords, technical bigrams and trigrams."""
    if not text:
        return []

    text_clean = clean_text_for_keywords(text)
    words = [w.strip('.') for w in text_clean.split()]

    single_keywords: List[str] = []
    for word in words:
        if (
            len(word) >= min_length
            and word not in STOP_WORDS
            and not word.isdigit()
            and re.search(r'[a-zA-Z]', word)
        ):
            single_keywords.append(word)

    keywords = list(single_keywords)

    # N-grams matching
    if len(words) >= 2:
        for i in range(len(words) - 1):
            bigram = f"{words[i]} {words[i + 1]}"
            if bigram in IMPORTANT_BIGRAMS:
                keywords.append(bigram)

        for i in range(len(words) - 2):
            trigram = f"{words[i]} {words[i + 1]} {words[i + 2]}"
            if trigram in IMPORTANT_TRIGRAMS:
                keywords.append(trigram)

    return keywords


def extract_skills_categorized(text: str) -> Dict[str, List[str]]:
    """Extracts known technical skills into category buckets."""
    text_lower = text.lower()
    categories: Dict[str, List[str]] = {
        'languages': [],
        'frameworks': [],
        'databases': [],
        'cloud_devops': [],
        'ai_ml': [],
        'methodologies': [],
    }

    patterns = {
        'languages': r'\b(python|java|javascript|typescript|c\+\+|c#|go|golang|rust|ruby|php|swift|kotlin|scala|sql|html|css|bash)\b',
        'frameworks': r'\b(react|reactjs|angular|vue|nextjs|next\.js|node|nodejs|express|django|flask|fastapi|spring|springboot|rails|laravel|\.net|tailwind)\b',
        'databases': r'\b(postgresql|postgres|mysql|mongodb|redis|elasticsearch|sqlite|dynamodb|oracle|cassandra|snowflake)\b',
        'cloud_devops': r'\b(aws|azure|gcp|docker|kubernetes|k8s|terraform|ansible|jenkins|ci/cd|git|github|gitlab|linux|nginx)\b',
        'ai_ml': r'\b(machine learning|deep learning|tensorflow|pytorch|scikit-learn|pandas|numpy|nlp|llm|llms|rag|genai)\b',
        'methodologies': r'\b(agile|scrum|rest|api|microservices|system design|tdd|graphql)\b',
    }

    for cat, pat in patterns.items():
        found = set(re.findall(pat, text_lower, re.IGNORECASE))
        categories[cat] = sorted(list(found))

    return categories


def calculate_tfidf_weights(keywords: List[str]) -> Dict[str, float]:
    """Assigns higher importance weights to technical terms and multi-word phrases."""
    tf = Counter(keywords)
    total_terms = len(keywords)
    weights: Dict[str, float] = {}

    for keyword, count in tf.items():
        base_weight = count / total_terms if total_terms > 0 else 0
        kw_lower = keyword.lower()

        if kw_lower in TECHNICAL_TERMS or any(t in kw_lower for t in TECHNICAL_TERMS if len(t) > 3):
            weights[keyword] = base_weight * 3.0
        elif len(keyword.split()) >= 2:
            weights[keyword] = base_weight * 2.0
        else:
            weights[keyword] = base_weight * 1.0

    if weights:
        max_weight = max(weights.values())
        if max_weight > 0:
            weights = {k: v / max_weight for k, v in weights.items()}

    return weights


def calculate_keyword_overlap(resume_keywords: List[str], jd_keywords: List[str]) -> float:
    """Calculates TF-IDF weighted overlap percentage (0-100) between resume and job description."""
    if not jd_keywords:
        return 0.0

    jd_weights = calculate_tfidf_weights(jd_keywords)
    resume_set = set(kw.lower() for kw in resume_keywords)

    matched_weight = 0.0
    total_weight = 0.0

    for keyword in jd_keywords:
        kw_lower = keyword.lower()
        weight = jd_weights.get(keyword, 0.1)
        total_weight += weight

        if kw_lower in resume_set:
            matched_weight += weight
        else:
            for rkw in resume_set:
                if kw_lower in rkw or rkw in kw_lower:
                    matched_weight += weight * 0.7
                    break

    if total_weight == 0:
        return 0.0

    raw_score = (matched_weight / total_weight) * 100
    return min(100.0, round(raw_score * 1.15, 1))


def get_missing_keywords(resume_keywords: List[str], jd_keywords: List[str]) -> Dict[str, List[str]]:
    """Identifies keywords in the job description that are missing from the resume, categorized by severity."""
    if not jd_keywords:
        return {'critical': [], 'important': [], 'optional': []}

    resume_set = set(kw.lower() for kw in resume_keywords)
    resume_words = set()
    for kw in resume_set:
        for w in kw.split():
            if len(w) >= 3:
                resume_words.add(w)

    def is_matched(kw_lower: str) -> bool:
        if kw_lower in resume_set:
            return True
        if any(kw_lower in rkw or rkw in kw_lower for rkw in resume_set):
            return True
        words = kw_lower.split()
        if len(words) >= 2 and all(w in resume_words for w in words if len(w) >= 3):
            return True
        stem = kw_lower.rstrip('s')
        if stem != kw_lower and (stem in resume_set or any(stem in rkw for rkw in resume_set)):
            return True
        return False

    seen: Set[str] = set()
    missing: List[str] = []
    for kw in jd_keywords:
        kw_lower = kw.lower()
        if kw_lower in seen:
            continue
        seen.add(kw_lower)
        if not is_matched(kw_lower):
            missing.append(kw)

    critical: List[str] = []
    important: List[str] = []
    optional: List[str] = []

    for kw in missing:
        kw_lower = kw.lower()
        kw_stem = kw_lower.rstrip('s')
        is_tech = (
            kw_lower in TECHNICAL_TERMS
            or kw_stem in TECHNICAL_TERMS
            or any(t in kw_lower for t in TECHNICAL_TERMS if len(t) >= 3)
        )
        is_phrase = len(kw.split()) >= 2

        if is_tech:
            critical.append(kw)
        elif is_phrase:
            important.append(kw)
        else:
            optional.append(kw)

    return {
        'critical': critical[:8],
        'important': important[:8],
        'optional': optional[:10],
    }


def get_matched_keywords(resume_keywords: List[str], jd_keywords: List[str]) -> List[str]:
    """Returns deduplicated list of matched keywords between resume and JD."""
    resume_set = set(kw.lower() for kw in resume_keywords)
    matched = []
    seen = set()

    for kw in jd_keywords:
        kw_lower = kw.lower()
        if kw_lower in seen:
            continue
        if kw_lower in resume_set or any(kw_lower in r or r in kw_lower for r in resume_set):
            matched.append(kw)
            seen.add(kw_lower)

    return matched[:25]

# [AR] خدمات التحليلات — منطق اقتراح النطاق بناءً على الكلمات الرئيسية
# [EN] Analytics services — keyword-based domain suggestion logic for captures
from __future__ import annotations

# [AR] خريطة الكلمات الرئيسية → النطاق (مأخوذة من contracts/capture-api.md)
# [EN] Keyword → domain mapping (from contracts/capture-api.md)
DOMAIN_KEYWORDS: dict[str, list[str]] = {
    'now':          ['today', 'urgent', 'now', 'asap', 'immediately', 'quick', 'reminder', 'schedule'],
    'goals':        ['goal', 'achieve', 'vision', 'plan', 'project', 'objective', 'milestone', 'dream', 'aspire'],
    'build':        ['client', 'business', 'revenue', 'service', 'product', 'proposal', 'call', 'outreach', 'pitch', 'invoice', 'deal', 'contract', 'freelance'],
    'life':         ['health', 'exercise', 'diet', 'mood', 'prayer', 'journal', 'habit', 'routine', 'family', 'sleep', 'finance', 'money', 'expense', 'budget'],
    'learn':        ['learn', 'study', 'course', 'book', 'read', 'research', 'skill', 'practice', 'tutorial'],
    'intelligence': ['analyze', 'data', 'report', 'review', 'insight', 'analytics', 'metric', 'track'],
    'profile':      ['profile', 'about', 'identity', 'contact', 'personal', 'bio'],
}


def suggest_domain(title: str) -> dict:
    """Return the most likely hub domain for the given capture title.

    Returns a dict with keys: suggested_domain (str|None), confidence, matched_keywords.
    """
    if not title or not title.strip():
        return {'suggested_domain': None, 'confidence': 'none', 'matched_keywords': []}

    words = title.lower().split()
    scores: dict[str, int] = {}
    matched: list[str] = []

    for word in words:
        for domain, keywords in DOMAIN_KEYWORDS.items():
            for kw in keywords:
                if kw in word or word in kw:
                    scores[domain] = scores.get(domain, 0) + 1
                    if word not in matched:
                        matched.append(word)

    if not scores:
        return {'suggested_domain': None, 'confidence': 'none', 'matched_keywords': []}

    best_domain = max(scores, key=lambda d: scores[d])
    best_score = scores[best_domain]
    confidence = 'high' if best_score >= 2 else 'low'

    return {
        'suggested_domain': best_domain,
        'confidence': confidence,
        'matched_keywords': matched,
    }

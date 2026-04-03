# Personal Life OS — Development Rules

## The File Size Rule (Read This Carefully)

The guiding principle is **one responsibility per file**, not a hard line count.

The 150-line number is a *trigger to ask a question*:
> "Does this file do more than one thing?"

If the answer is **no** — keep it together, regardless of length.
If the answer is **yes** — split it, regardless of length.

### Split when:
- A file contains two or more genuinely independent classes or concerns
- The two halves could be understood, tested, or changed without touching each other
- Example: `models/health_log.py` and `models/habit.py` — unrelated models, clean split

### Do NOT split when:
- A single service has deep, cohesive logic that happens to be long
- Splitting would produce `service_part1.py` / `service_part2.py` — that's mechanical, not meaningful
- All the logic operates on the same data and calls the same dependencies
- Example: `finance/services.py` — one class, one job (calculate metrics). Splitting adds noise.

### Real examples from this codebase:
| File | Lines | Split? | Why |
|---|---|---|---|
| `health/models/` | package | ✅ Yes | 5 unrelated models |
| `analytics/models/` | package | ✅ Yes | 8 unrelated models |
| `finance/services.py` | 117 | ❌ No | One class, one job |
| `goals/services.py` | 187 | ❌ No | Two tightly coupled classes on the same graph |
| `core/ai.py` | 238 | ❌ No | Abstract class + two implementations of the same interface |
| `schedule/services.py` | 335 | ❌ No | One complex domain, cohesive logic throughout |

---

## Other Rules

- **Docstrings everywhere** — every file, class, and function gets a docstring or comment explaining what it does
- **Environment variables for all secrets** — never hardcode keys, passwords, or tokens
- **UUID primary keys** on all models — via `config/base_model.py`
- **One serializer per file** is fine for small models; grouping related serializers in one file is fine too
- **Services own business logic** — views stay thin, models stay dumb, services do the work
- **Deterministic fallback** — any AI-dependent logic must work without an API key (see `core/ai.py`)

"""Full JSON export service and endpoint for Personal Life OS.

Produces a single JSON file containing all 15 domain tables as defined
in the Logic Spec §15. Used for backup, external analysis, and migration.

Export shape:
{
  "exported_at": "ISO datetime",
  "version": "1.0",
  "profile": {...},
  "nodes": [...],
  "finance": [...],
  "health": [...],
  ... (all domains)
}
"""
import datetime

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models import (
    Achievement, AISuggestion, DecisionLog, FamilyGoal,
    Idea, Learning, Relationship, WeeklyReview,
)
from analytics.serializers.crud_models import (
    AchievementSerializer, DecisionLogSerializer, FamilyGoalSerializer,
    IdeaSerializer, LearningSerializer, RelationshipSerializer,
)
from analytics.serializers.ai_suggestion import AISuggestionSerializer
from analytics.serializers.weekly_review import WeeklyReviewSerializer
from core.models import DailyCheckIn, Profile
from core.serializers import DailyCheckInSerializer, ProfileSerializer
from finance.models import FinanceEntry
from finance.serializers import FinanceEntrySerializer
from goals.models import Node
from goals.serializers import NodeSerializer
from health.models import HealthLog, Habit, HabitLog, MoodLog, SpiritualLog
from health.serializers import (
    HealthLogSerializer, HabitSerializer, HabitLogSerializer,
    MoodLogSerializer, SpiritualLogSerializer,
)
from pipeline.models import Client, MarketingAction, Opportunity
from pipeline.serializers import ClientSerializer, MarketingActionSerializer, OpportunitySerializer
from schedule.models import ScheduleTemplate, ScheduleLog
from schedule.serializers import ScheduleTemplateSerializer, ScheduleLogSerializer


class FullExportView(APIView):
    """GET /api/core/export/ — Returns all domain data as a single JSON payload.

    Intended for: backup, migration, external analysis (e.g. Google Sheets),
    and the personal review report described in PRD §9.
    """

    def get(self, request):
        """Build and return the full export payload."""
        profile = Profile.objects.first()
        payload = {
            "exported_at": timezone.now().isoformat(),
            "version": "1.0",
            "profile": ProfileSerializer(profile).data if profile else None,
            "nodes": NodeSerializer(Node.objects.all(), many=True).data,
            "finance": FinanceEntrySerializer(FinanceEntry.objects.all(), many=True).data,
            "health": HealthLogSerializer(HealthLog.objects.all(), many=True).data,
            "habits": HabitSerializer(Habit.objects.all(), many=True).data,
            "habit_logs": HabitLogSerializer(HabitLog.objects.all(), many=True).data,
            "mood": MoodLogSerializer(MoodLog.objects.all(), many=True).data,
            "spiritual": SpiritualLogSerializer(SpiritualLog.objects.all(), many=True).data,
            "schedule_templates": ScheduleTemplateSerializer(
                ScheduleTemplate.objects.all(), many=True,
            ).data,
            "schedule_logs": ScheduleLogSerializer(ScheduleLog.objects.all(), many=True).data,
            "opportunities": OpportunitySerializer(Opportunity.objects.all(), many=True).data,
            "clients": ClientSerializer(Client.objects.all(), many=True).data,
            "marketing": MarketingActionSerializer(MarketingAction.objects.all(), many=True).data,
            "decisions": DecisionLogSerializer(DecisionLog.objects.all(), many=True).data,
            "learning": LearningSerializer(Learning.objects.all(), many=True).data,
            "achievements": AchievementSerializer(Achievement.objects.all(), many=True).data,
            "ideas": IdeaSerializer(Idea.objects.all(), many=True).data,
            "relations": RelationshipSerializer(Relationship.objects.all(), many=True).data,
            "family": FamilyGoalSerializer(FamilyGoal.objects.all(), many=True).data,
            "weekly_reviews": WeeklyReviewSerializer(WeeklyReview.objects.all(), many=True).data,
            "ai_suggestions": AISuggestionSerializer(AISuggestion.objects.all(), many=True).data,
            "checkins": DailyCheckInSerializer(DailyCheckIn.objects.all(), many=True).data,
        }
        return Response(payload)


# ── Per-domain export helpers ─────────────────────────────────────────────────

def _build_domain_json(domain: str) -> dict:
    """Return a dict of serialized data for a single domain."""
    from goals.models import LearningItem  # noqa: PLC0415
    from goals.serializers import NodeSerializer  # noqa: PLC0415
    from goals.views import LearningItemSerializer  # noqa: PLC0415
    from journal.models import JournalEntry  # noqa: PLC0415
    from journal.serializers import JournalEntrySerializer  # noqa: PLC0415

    if domain == "goals":
        return {
            "domain": "goals",
            "nodes": NodeSerializer(Node.objects.all(), many=True).data,
        }
    if domain == "finance":
        return {
            "domain": "finance",
            "entries": FinanceEntrySerializer(FinanceEntry.objects.all(), many=True).data,
        }
    if domain == "pipeline":
        return {
            "domain": "pipeline",
            "opportunities": OpportunitySerializer(Opportunity.objects.all(), many=True).data,
            "clients": ClientSerializer(Client.objects.all(), many=True).data,
            "marketing_actions": MarketingActionSerializer(MarketingAction.objects.all(), many=True).data,
        }
    if domain == "health":
        return {
            "domain": "health",
            "logs": HealthLogSerializer(HealthLog.objects.all(), many=True).data,
            "habits": HabitSerializer(Habit.objects.all(), many=True).data,
            "habit_logs": HabitLogSerializer(HabitLog.objects.all(), many=True).data,
            "mood": MoodLogSerializer(MoodLog.objects.all(), many=True).data,
            "spiritual": SpiritualLogSerializer(SpiritualLog.objects.all(), many=True).data,
        }
    if domain == "learning":
        return {
            "domain": "learning",
            "items": LearningItemSerializer(LearningItem.objects.all(), many=True).data,
        }
    if domain == "journal":
        return {
            "domain": "journal",
            "entries": JournalEntrySerializer(JournalEntry.objects.all(), many=True).data,
        }
    if domain == "ideas":
        return {
            "domain": "ideas",
            "ideas": IdeaSerializer(Idea.objects.all().order_by("-id"), many=True).data,
        }
    if domain == "contacts":
        from contacts.models import Contact  # noqa: PLC0415
        from contacts.serializers import ContactSerializer  # noqa: PLC0415
        return {
            "domain": "contacts",
            "contacts": ContactSerializer(Contact.objects.all().order_by("name"), many=True).data,
        }
    # "all" or unknown → full export
    profile = Profile.objects.first()
    return {
        "domain": "all",
        "exported_at": datetime.datetime.now().isoformat(),
        "version": "1.0",
        "profile": ProfileSerializer(profile).data if profile else None,
        "nodes": NodeSerializer(Node.objects.all(), many=True).data,
        "finance": FinanceEntrySerializer(FinanceEntry.objects.all(), many=True).data,
        "opportunities": OpportunitySerializer(Opportunity.objects.all(), many=True).data,
        "health": HealthLogSerializer(HealthLog.objects.all(), many=True).data,
        "learning": list(LearningItemSerializer(LearningItem.objects.all(), many=True).data),
    }


def _build_domain_markdown(domain: str) -> str:
    """Return an AI-readable markdown string for a single domain."""
    from django.utils import timezone  # noqa: PLC0415
    from goals.models import LearningItem  # noqa: PLC0415
    from journal.models import JournalEntry  # noqa: PLC0415

    today = timezone.localdate().isoformat()
    lines = []

    if domain == "goals":
        nodes = list(Node.objects.all().order_by("status", "-updated_at"))
        lines.append(f"# Goals & Nodes (exported {today})")
        lines.append(f"\nTotal: {len(nodes)} nodes\n")
        for status_label in ["active", "available", "blocked", "done", "deferred"]:
            group = [n for n in nodes if n.status == status_label]
            if not group:
                continue
            lines.append(f"\n## {status_label.title()} ({len(group)})")
            for n in group:
                deps_count = n.deps.count()
                unlocks = n.dependents.count()
                line = f"- **{n.title}** [{n.type}, {n.category or 'general'}]"
                if deps_count or unlocks:
                    line += f" — blocks {deps_count}, unlocks {unlocks}"
                if n.notes:
                    line += f"\n  Notes: {n.notes[:120]}"
                lines.append(line)

    elif domain == "finance":
        entries = list(FinanceEntry.objects.all().order_by("-date")[:60])
        lines.append(f"# Finance Entries (exported {today})")
        income = [e for e in entries if e.type == "income"]
        expense = [e for e in entries if e.type == "expense"]
        lines.append(f"\nIncome entries: {len(income)} | Expense entries: {len(expense)}\n")
        lines.append("## Recent Income")
        for e in income[:10]:
            lines.append(f"- {e.date}: {e.description or e.category} — {e.amount} {e.currency or 'EGP'}")
        lines.append("\n## Recent Expenses")
        for e in expense[:20]:
            lines.append(f"- {e.date}: {e.description or e.category} — {e.amount} {e.currency or 'EGP'}")

    elif domain == "pipeline":
        opps = list(Opportunity.objects.all().order_by("status"))
        lines.append(f"# Pipeline Opportunities (exported {today})")
        lines.append(f"\nTotal: {len(opps)} opportunities\n")
        for o in opps:
            lines.append(f"- **{o.name}** [{o.platform}] Status: {o.status}")
            if o.budget:
                lines.append(f"  Budget: {o.budget}")
            if o.description:
                lines.append(f"  {o.description[:150]}")

    elif domain == "health":
        logs = list(HealthLog.objects.all().order_by("-date")[:30])
        lines.append(f"# Health Logs (exported {today})")
        lines.append(f"\nLast {len(logs)} entries:\n")
        for log in logs:
            parts = [f"- {log.date}"]
            if hasattr(log, "sleep_hours") and log.sleep_hours:
                parts.append(f"Sleep: {log.sleep_hours}h")
            if hasattr(log, "energy") and log.energy:
                parts.append(f"Energy: {log.energy}/10")
            lines.append(" | ".join(parts))

    elif domain == "learning":
        items = list(LearningItem.objects.all().order_by("status", "title"))
        lines.append(f"# Learning Items (exported {today})")
        lines.append(f"\nTotal: {len(items)} items\n")
        for status_label in ["in_progress", "not_started", "done"]:
            group = [i for i in items if i.status == status_label]
            if not group:
                continue
            label = {"in_progress": "In Progress", "not_started": "To Read/Watch", "done": "Done"}[status_label]
            lines.append(f"\n## {label} ({len(group)})")
            for i in group:
                line = f"- **{i.title}** ({i.type})"
                if i.author:
                    line += f" by {i.author}"
                if i.status == "in_progress" and i.progress_pct:
                    line += f" — {i.progress_pct}% done"
                if i.notes:
                    line += f"\n  {i.notes[:100]}"
                lines.append(line)

    elif domain == "journal":
        entries = list(JournalEntry.objects.all().order_by("-date")[:20])
        lines.append(f"# Journal Entries (exported {today})")
        lines.append(f"\nLast {len(entries)} entries:\n")
        for e in entries:
            lines.append(f"## {e.date}")
            if e.wins:
                lines.append(f"Wins: {e.wins[:200]}")
            if e.gratitude:
                lines.append(f"Grateful: {e.gratitude[:150]}")
            if e.tomorrow_focus:
                lines.append(f"Tomorrow: {e.tomorrow_focus[:150]}")

    elif domain == "ideas":
        from analytics.models import Idea  # noqa: PLC0415
        ideas = list(Idea.objects.all().order_by("-id"))
        lines.append(f"# Ideas (exported {today})")
        lines.append(f"\nTotal: {len(ideas)} ideas\n")
        for status_label in ["raw", "exploring", "validated", "archived"]:
            group = [i for i in ideas if i.status == status_label]
            if not group:
                continue
            lines.append(f"\n## {status_label.capitalize()} ({len(group)})")
            for idea in group:
                ctx = (idea.context or "")[:120]
                line = f"- **{idea.title}**"
                if ctx:
                    line += f" — {ctx}"
                lines.append(line)

    elif domain == "contacts":
        from contacts.models import Contact  # noqa: PLC0415
        contacts = list(Contact.objects.all().order_by("name"))
        lines.append(f"# Contacts (exported {today})")
        lines.append(f"\nTotal: {len(contacts)} contacts\n")
        for c in contacts:
            meta_parts = [c.relation, c.company, c.email]
            meta_str = " | ".join(x for x in meta_parts if x)
            notes_snippet = (c.notes or "")[:100]
            line = f"- **{c.name}** [{meta_str}]"
            if notes_snippet:
                line += f" — {notes_snippet}"
            lines.append(line)

    else:
        # "all" domain in markdown — brief summary of each
        from analytics.models import Idea  # noqa: PLC0415
        lines.append(f"# Personal OS Full Export — {today}\n")
        lines.append(f"- Goals/Nodes: {Node.objects.count()}")
        lines.append(f"- Opportunities: {Opportunity.objects.count()}")
        lines.append(f"- Finance Entries: {FinanceEntry.objects.count()}")
        lines.append(f"- Health Logs: {HealthLog.objects.count()}")
        lines.append(f"- Learning Items: {LearningItem.objects.count()}")
        lines.append(f"- Ideas: {Idea.objects.count()}")
        lines.append(f"\nFor full data, use JSON format.")

    return "\n".join(lines)


class DomainExportView(APIView):
    """GET /api/core/export/domain/?domain=goals&format=markdown

    Returns a focused export for a single domain, optionally as
    AI-readable markdown suitable for pasting into Claude / ChatGPT.

    Query params:
      domain  — goals | finance | pipeline | health | learning | journal | all
      format  — json (default) | markdown
    """

    def get(self, request):
        domain = request.query_params.get("domain", "all")
        fmt = request.query_params.get("format", "json")

        if fmt == "markdown":
            text = _build_domain_markdown(domain)
            from django.http import HttpResponse  # noqa: PLC0415
            return HttpResponse(text, content_type="text/plain; charset=utf-8")

        data = _build_domain_json(domain)
        return Response(data)


# ── HTTP Import ────────────────────────────────────────────────────────────────

IMPORT_SCHEMAS = {
    "goals": {
        "description": "Create goal/task nodes. Pass update_existing=true to append notes to existing nodes.",
        "fields": ["title (required)", "type (goal/project/task/idea)", "status", "notes", "category"],
        "example": [{"title": "Write case study", "type": "task", "notes": "For Sandton client"}],
    },
    "pipeline": {
        "description": "Create pipeline opportunities",
        "fields": ["name (required)", "platform (required)", "status", "description", "budget"],
        "example": [{"name": "Logistics startup audit", "platform": "linkedin", "description": "Operational review"}],
    },
    "learning": {
        "description": "Add learning items (books, courses, articles)",
        "fields": ["title (required)", "type (book/course/article/video/podcast/other)", "status", "author", "notes"],
        "example": [{"title": "Deep Work", "type": "book", "author": "Cal Newport"}],
    },
    "finance": {
        "description": "Add income or expense entries",
        "fields": ["type (required: income/expense)", "amount (required)", "source", "category", "currency (EUR/USD/EGP)", "date (YYYY-MM-DD)", "notes"],
        "example": [{"type": "expense", "amount": 150, "source": "Office supplies", "category": "Business", "currency": "EGP"}],
    },
    "ideas": {
        "description": "Add new ideas (skips duplicates by title)",
        "fields": ["title (required)", "context", "status (raw/exploring/validated/archived)"],
        "example": [{"title": "Offer 48h express audit service", "context": "For clients who need fast results", "status": "raw"}],
    },
    "contacts": {
        "description": "Add new contacts (skips duplicates by name)",
        "fields": ["name (required)", "relation (client/prospect/mentor/friend/family/colleague/other)", "company", "email", "phone", "notes"],
        "example": [{"name": "Ahmed Khalil", "relation": "prospect", "company": "Cairo Logistics", "email": "ahmed@example.com"}],
    },
    "journal": {
        "description": "Add journal entries by date (skips if date already has an entry)",
        "fields": ["date (required: YYYY-MM-DD)", "gratitude", "wins", "tomorrow_focus", "mood_note"],
        "example": [{"date": "2026-04-14", "gratitude": "Good progress", "wins": "Finished AI Bridge", "tomorrow_focus": "Outreach call"}],
    },
    "habits": {
        "description": "Add new habits to track (skips duplicates by name)",
        "fields": ["name (required)", "target (daily/3x_week/weekly/custom)"],
        "example": [{"name": "Evening walk", "target": "daily"}, {"name": "Read 10 pages", "target": "3x_week"}],
    },
}


def _import_goals(items: list, dry_run: bool, update_existing: bool = False) -> dict:
    from goals.models import Node  # noqa: PLC0415
    preview, created, updated, skipped, errors = [], 0, 0, 0, []
    for item in items:
        title = (item.get("title") or "").strip()
        if not title:
            errors.append({"item": item, "error": "title is required"})
            continue
        existing = Node.objects.filter(title__iexact=title).first()
        if existing:
            if update_existing and (item.get("notes") or item.get("status")):
                # Append notes and/or update status on the existing node
                changes = []
                if item.get("notes"):
                    old_notes = existing.notes or ""
                    new_note  = item["notes"].strip()
                    changes.append(f"notes appended")
                    if not dry_run:
                        existing.notes = (old_notes + "\n---\n" + new_note).strip() if old_notes else new_note
                if item.get("status") and item["status"] != existing.status:
                    changes.append(f"status → {item['status']}")
                    if not dry_run:
                        existing.status = item["status"]
                if not dry_run and changes:
                    existing.save()
                preview.append({"name": title, "action": "update", "type": existing.type, "changes": ", ".join(changes) or "no changes"})
                updated += 1
            else:
                preview.append({"name": title, "action": "skip", "reason": "already exists"})
                skipped += 1
            continue
        preview.append({"name": title, "action": "create", "type": item.get("type", "task")})
        if not dry_run:
            Node.objects.create(
                title=title,
                type=item.get("type", "task"),
                status=item.get("status", "active"),
                category=item.get("category", ""),
                notes=item.get("notes", ""),
            )
        created += 1
    return {"preview": preview, "created": created, "updated": updated, "skipped": skipped, "errors": errors}


def _import_finance(items: list, dry_run: bool) -> dict:
    from django.utils import timezone  # noqa: PLC0415
    from finance.models import FinanceEntry  # noqa: PLC0415
    preview, created, skipped, errors = [], 0, 0, []
    today = timezone.localdate().isoformat()
    for item in items:
        entry_type = (item.get("type") or "").strip().lower()
        if entry_type not in ("income", "expense"):
            errors.append({"item": item, "error": "type must be 'income' or 'expense'"})
            continue
        amount = item.get("amount")
        if amount is None:
            errors.append({"item": item, "error": "amount is required"})
            continue
        source = (item.get("source") or item.get("description") or "").strip()
        label = source or entry_type
        preview.append({"name": f"{entry_type}: {label} ({amount})", "action": "create", "type": entry_type})
        if not dry_run:
            FinanceEntry.objects.create(
                type=entry_type,
                source=source,
                amount=amount,
                currency=item.get("currency", "EGP"),
                category=item.get("category", ""),
                date=item.get("date", today),
                notes=item.get("notes", ""),
            )
        created += 1
    return {"preview": preview, "created": created, "skipped": skipped, "errors": errors}


def _import_ideas(items: list, dry_run: bool) -> dict:
    from analytics.models import Idea  # noqa: PLC0415
    preview, created, skipped, errors = [], 0, 0, []
    for item in items:
        title = (item.get("title") or "").strip()
        if not title:
            errors.append({"item": item, "error": "title is required"})
            continue
        if Idea.objects.filter(title__iexact=title).exists():
            preview.append({"name": title, "action": "skip", "reason": "already exists"})
            skipped += 1
            continue
        preview.append({"name": title, "action": "create", "type": item.get("status", "raw")})
        if not dry_run:
            Idea.objects.create(
                title=title,
                context=item.get("context", ""),
                status=item.get("status", "raw"),
            )
        created += 1
    return {"preview": preview, "created": created, "skipped": skipped, "errors": errors}


def _import_contacts(items: list, dry_run: bool) -> dict:
    from contacts.models import Contact  # noqa: PLC0415
    preview, created, skipped, errors = [], 0, 0, []
    for item in items:
        name = (item.get("name") or "").strip()
        if not name:
            errors.append({"item": item, "error": "name is required"})
            continue
        if Contact.objects.filter(name__iexact=name).exists():
            preview.append({"name": name, "action": "skip", "reason": "already exists"})
            skipped += 1
            continue
        relation = item.get("relation", "other")
        preview.append({"name": name, "action": "create", "type": relation})
        if not dry_run:
            Contact.objects.create(
                name=name,
                relation=relation,
                company=item.get("company", ""),
                email=item.get("email", ""),
                phone=item.get("phone", ""),
                notes=item.get("notes", ""),
            )
        created += 1
    return {"preview": preview, "created": created, "skipped": skipped, "errors": errors}


def _import_journal(items: list, dry_run: bool) -> dict:
    from journal.models import JournalEntry  # noqa: PLC0415
    preview, created, skipped, errors = [], 0, 0, []
    for item in items:
        date = (item.get("date") or "").strip()
        if not date:
            errors.append({"item": item, "error": "date is required (YYYY-MM-DD)"})
            continue
        if JournalEntry.objects.filter(date=date).exists():
            preview.append({"name": date, "action": "skip", "reason": "entry for this date already exists"})
            skipped += 1
            continue
        preview.append({"name": date, "action": "create", "type": "journal"})
        if not dry_run:
            JournalEntry.objects.create(
                date=date,
                mood_note=item.get("mood_note", ""),
                gratitude=item.get("gratitude", ""),
                wins=item.get("wins", ""),
                tomorrow_focus=item.get("tomorrow_focus", ""),
            )
        created += 1
    return {"preview": preview, "created": created, "skipped": skipped, "errors": errors}


def _import_habits(items: list, dry_run: bool) -> dict:
    from health.models import Habit  # noqa: PLC0415
    VALID_TARGETS = {"daily", "3x_week", "weekly", "custom"}
    preview, created, skipped, errors = [], 0, 0, []
    for item in items:
        name = (item.get("name") or "").strip()
        if not name:
            errors.append({"item": item, "error": "name is required"})
            continue
        if Habit.objects.filter(name__iexact=name).exists():
            preview.append({"name": name, "action": "skip", "reason": "already exists"})
            skipped += 1
            continue
        target = item.get("target", "daily")
        if target not in VALID_TARGETS:
            target = "daily"
        preview.append({"name": name, "action": "create", "type": target})
        if not dry_run:
            Habit.objects.create(name=name, target=target)
        created += 1
    return {"preview": preview, "created": created, "skipped": skipped, "errors": errors}


def _import_pipeline(items: list, dry_run: bool) -> dict:
    preview, created, skipped, errors = [], 0, 0, []
    for item in items:
        name = (item.get("name") or "").strip()
        platform = (item.get("platform") or "").strip()
        if not name:
            errors.append({"item": item, "error": "name is required"})
            continue
        if not platform:
            errors.append({"item": item, "error": "platform is required"})
            continue
        exists = Opportunity.objects.filter(name__iexact=name, platform__iexact=platform).exists()
        if exists:
            preview.append({"name": name, "action": "skip", "reason": "already exists"})
            skipped += 1
            continue
        preview.append({"name": name, "action": "create", "type": platform})
        if not dry_run:
            from django.utils import timezone  # noqa: PLC0415
            Opportunity.objects.create(
                name=name,
                platform=platform,
                status=item.get("status", "new"),
                description=item.get("description", ""),
                budget=item.get("budget") or None,
                date_found=timezone.localdate().isoformat(),
            )
        created += 1
    return {"preview": preview, "created": created, "skipped": skipped, "errors": errors}


def _import_learning(items: list, dry_run: bool) -> dict:
    from goals.models import LearningItem  # noqa: PLC0415
    preview, created, skipped, errors = [], 0, 0, []
    for item in items:
        title = (item.get("title") or "").strip()
        if not title:
            errors.append({"item": item, "error": "title is required"})
            continue
        exists = LearningItem.objects.filter(title__iexact=title).exists()
        if exists:
            preview.append({"name": title, "action": "skip", "reason": "already exists"})
            skipped += 1
            continue
        item_type = item.get("type", "book")
        preview.append({"name": title, "action": "create", "type": item_type})
        if not dry_run:
            LearningItem.objects.create(
                title=title,
                type=item_type,
                author=item.get("author", ""),
                status=item.get("status", "not_started"),
                notes=item.get("notes", ""),
            )
        created += 1
    return {"preview": preview, "created": created, "skipped": skipped, "errors": errors}


class DomainImportView(APIView):
    """POST /api/core/import/

    Accepts a list of records for a given domain and creates them.
    Two-phase: first call with confirm=false (default) returns a preview.
    Second call with confirm=true executes the writes.

    Body: { "domain": "goals", "data": [...], "confirm": false }
    """

    def get(self, request):
        """Return available domains and their expected schemas."""
        return Response({
            "domains": IMPORT_SCHEMAS,
            "usage": "POST with { domain, data: [...], confirm: false } to preview, then confirm: true to execute.",
        })

    def post(self, request):
        domain = request.data.get("domain", "")
        data = request.data.get("data", [])
        confirm = request.data.get("confirm", False)

        if domain not in IMPORT_SCHEMAS:
            return Response(
                {"error": f"Unknown domain '{domain}'. Valid: {list(IMPORT_SCHEMAS.keys())}"},
                status=400,
            )
        if not isinstance(data, list):
            return Response({"error": "data must be a JSON array"}, status=400)
        if not data:
            return Response({"error": "data array is empty"}, status=400)

        dry_run = not confirm
        update_existing = bool(request.data.get("update_existing", False))

        if domain == "goals":
            result = _import_goals(data, dry_run, update_existing=update_existing)
        elif domain == "pipeline":
            result = _import_pipeline(data, dry_run)
        elif domain == "learning":
            result = _import_learning(data, dry_run)
        elif domain == "finance":
            result = _import_finance(data, dry_run)
        elif domain == "ideas":
            result = _import_ideas(data, dry_run)
        elif domain == "contacts":
            result = _import_contacts(data, dry_run)
        elif domain == "journal":
            result = _import_journal(data, dry_run)
        elif domain == "habits":
            result = _import_habits(data, dry_run)
        else:
            return Response({"error": f"Import for '{domain}' not yet supported"}, status=400)

        result["domain"] = domain
        result["dry_run"] = dry_run
        return Response(result, status=200)

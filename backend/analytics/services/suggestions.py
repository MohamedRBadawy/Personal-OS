"""Signal-discipline rules and orchestration for AI suggestions."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from analytics.models.ai_suggestion import AISuggestion
from analytics.models.weekly_review import WeeklyReview
from analytics.services.overwhelm import OverwhelmService
from health.services import HealthSummaryService
from pipeline.services import OpportunityLifecycleService


class AISuggestionDisciplineService:
    """Prevents duplicate and over-ignored suggestions."""

    @staticmethod
    def _week_bounds(current_date):
        week_start = current_date - timedelta(days=current_date.weekday())
        week_end = week_start + timedelta(days=6)
        return week_start, week_end

    @classmethod
    def validate(cls, *, topic, module, instance=None, current_date=None):
        """Reject repeated or suppressed suggestions."""
        current_date = current_date or timezone.localdate()
        week_start, week_end = cls._week_bounds(current_date)
        duplicates = AISuggestion.objects.filter(
            topic=topic,
            module=module,
            shown_at__date__range=(week_start, week_end),
        )
        if instance:
            duplicates = duplicates.exclude(pk=instance.pk)
        if duplicates.exists():
            raise ValidationError("This suggestion topic has already been shown this week.")

        recent = AISuggestion.objects.filter(topic=topic, module=module).order_by("-shown_at")
        if instance:
            recent = recent.exclude(pk=instance.pk)

        ignored_count = 0
        for suggestion in recent[:5]:
            if suggestion.acted_on:
                break
            ignored_count += 1
            if ignored_count >= 3:
                raise ValidationError("This topic is suppressed after three ignored suggestions.")


class AISuggestionService:
    """Create, reuse, and resolve deterministic suggestions from write flows."""

    TOPIC_WEEKLY_REVIEW = "weekly_review"
    TOPIC_PIPELINE_FOLLOW_UP = "pipeline_follow_up"
    TOPIC_EMPTY_PIPELINE = "empty_pipeline"
    TOPIC_LOW_ENERGY_REDUCED_SCOPE = "low_energy_reduced_scope"
    TOPIC_HABIT_RESET = "habit_reset"

    MODULE_ANALYTICS = "analytics"
    MODULE_PIPELINE = "pipeline"
    MODULE_TODAY = "today"

    @staticmethod
    def _unresolved_queryset():
        return AISuggestion.objects.filter(
            acted_on=False,
            dismissed_at__isnull=True,
        )

    @classmethod
    def _unresolved_for(cls, *, topic, module):
        return cls._unresolved_queryset().filter(topic=topic, module=module).order_by("-shown_at").first()

    @staticmethod
    def _suggestion_text(*, topic, reference_date, pipeline_summary=None):
        if topic == AISuggestionService.TOPIC_WEEKLY_REVIEW:
            week_start = reference_date - timedelta(days=reference_date.weekday())
            week_end = week_start + timedelta(days=6)
            return (
                f"Generate the weekly review for {week_start.isoformat()} to {week_end.isoformat()} "
                "so the system closes the week before the next one starts."
            )
        if topic == AISuggestionService.TOPIC_PIPELINE_FOLLOW_UP:
            due_follow_ups = pipeline_summary["due_follow_ups_count"] if pipeline_summary else 0
            return f"{due_follow_ups} pipeline follow-up item(s) are due. Close at least one loop today."
        if topic == AISuggestionService.TOPIC_EMPTY_PIPELINE:
            return "The active pipeline is empty. Capture or pursue one opportunity today to protect the income goal."
        if topic == AISuggestionService.TOPIC_LOW_ENERGY_REDUCED_SCOPE:
            return "Low energy or reduced mode is active. Narrow the day and protect one lighter, high-leverage move."
        if topic == AISuggestionService.TOPIC_HABIT_RESET:
            return "Habit follow-through is slipping. Re-anchor one basic habit today before expanding scope."
        return "Capture the next useful move."

    @classmethod
    def create_or_reuse(cls, *, topic, module, reference_date=None, suggestion_text=None):
        """Return an existing unresolved suggestion or create a new one when allowed."""
        reference_date = reference_date or timezone.localdate()
        existing = cls._unresolved_for(topic=topic, module=module)
        if existing:
            return existing, False

        try:
            AISuggestionDisciplineService.validate(
                topic=topic,
                module=module,
                current_date=reference_date,
            )
        except ValidationError:
            return None, False

        suggestion = AISuggestion.objects.create(
            topic=topic,
            module=module,
            suggestion_text=suggestion_text or cls._suggestion_text(topic=topic, reference_date=reference_date),
        )
        return suggestion, True

    @staticmethod
    def act(suggestion):
        """Mark a suggestion as explicitly acted on."""
        suggestion.acted_on = True
        suggestion.dismissed_at = None
        suggestion.save(update_fields=["acted_on", "dismissed_at"])
        return suggestion

    @staticmethod
    def dismiss(suggestion):
        """Mark a suggestion as dismissed for discipline tracking."""
        suggestion.acted_on = False
        suggestion.dismissed_at = timezone.now()
        suggestion.save(update_fields=["acted_on", "dismissed_at"])
        return suggestion

    @classmethod
    def mark_topic_acted(cls, *, topic, module):
        """Resolve any unresolved suggestions for the given topic/module."""
        updated = []
        for suggestion in cls._unresolved_queryset().filter(topic=topic, module=module):
            updated.append(cls.act(suggestion))
        return updated

    @classmethod
    def summary(cls):
        """Return unresolved suggestion counts for dashboard use."""
        pending = list(cls._unresolved_queryset())
        by_module = {}
        for suggestion in pending:
            by_module[suggestion.module] = by_module.get(suggestion.module, 0) + 1
        return {
            "pending_count": len(pending),
            "by_module": by_module,
        }

    @classmethod
    def generate_for_checkin(cls, *, reference_date=None):
        """Generate or reuse suggestions after the daily check-in write flow."""
        reference_date = reference_date or timezone.localdate()
        health_summary = HealthSummaryService.summary(reference_date)
        overwhelm_summary = OverwhelmService.summary(reference_date)
        pipeline_summary = OpportunityLifecycleService.summary()
        review_exists = WeeklyReview.objects.filter(
            week_start=reference_date - timedelta(days=reference_date.weekday()),
            week_end=(reference_date - timedelta(days=reference_date.weekday())) + timedelta(days=6),
        ).exists()

        created = []
        candidate_topics = []
        if reference_date.weekday() >= 4 and not review_exists:
            candidate_topics.append((cls.TOPIC_WEEKLY_REVIEW, cls.MODULE_ANALYTICS))
        if pipeline_summary["due_follow_ups_count"] > 0:
            candidate_topics.append((cls.TOPIC_PIPELINE_FOLLOW_UP, cls.MODULE_PIPELINE))
        if pipeline_summary["empty_pipeline"]:
            candidate_topics.append((cls.TOPIC_EMPTY_PIPELINE, cls.MODULE_PIPELINE))
        if health_summary["low_energy_today"] or overwhelm_summary["reduced_mode"]:
            candidate_topics.append((cls.TOPIC_LOW_ENERGY_REDUCED_SCOPE, cls.MODULE_TODAY))
        if (
            health_summary["habit_completion_rate_7d"] is not None
            and health_summary["habit_completion_rate_7d"] < 50
        ):
            candidate_topics.append((cls.TOPIC_HABIT_RESET, cls.MODULE_TODAY))

        for topic, module in candidate_topics:
            suggestion, was_created = cls.create_or_reuse(
                topic=topic,
                module=module,
                reference_date=reference_date,
                suggestion_text=cls._suggestion_text(
                    topic=topic,
                    reference_date=reference_date,
                    pipeline_summary=pipeline_summary,
                ),
            )
            if suggestion and was_created:
                created.append(suggestion)
        return created

    @classmethod
    def generate_for_review(cls, *, reference_date=None):
        """Generate follow-on suggestions after the weekly review is persisted."""
        reference_date = reference_date or timezone.localdate()
        cls.mark_topic_acted(topic=cls.TOPIC_WEEKLY_REVIEW, module=cls.MODULE_ANALYTICS)
        return cls.generate_for_checkin(reference_date=reference_date)

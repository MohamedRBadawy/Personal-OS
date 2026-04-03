"""Read models and orchestration for the schedule domain."""
from datetime import timedelta

from django.utils import timezone

from analytics.services.overwhelm import OverwhelmService
from goals.models import Node
from health.services import HealthSummaryService
from pipeline.models import MarketingAction
from schedule.models import ScheduleBlock, ScheduleLog, ScheduleTemplate


class TodayScheduleService:
    """Build the daily schedule read model used by the frontend."""

    goal_status_order = {
        Node.Status.ACTIVE: 0,
        Node.Status.AVAILABLE: 1,
        Node.Status.BLOCKED: 2,
        Node.Status.DONE: 3,
    }

    low_energy_type_order = {
        Node.NodeType.SUB_TASK: 0,
        Node.NodeType.TASK: 1,
        Node.NodeType.PROJECT: 2,
        Node.NodeType.GOAL: 3,
    }

    normal_type_order = {
        Node.NodeType.PROJECT: 0,
        Node.NodeType.TASK: 1,
        Node.NodeType.SUB_TASK: 2,
        Node.NodeType.GOAL: 3,
    }

    @classmethod
    def _active_template(cls):
        return (
            ScheduleTemplate.objects.filter(is_active=True)
            .prefetch_related("blocks")
            .order_by("created_at", "id")
            .last()
        )

    @classmethod
    def _available_goal_nodes(cls, low_energy_today):
        nodes = list(
            Node.objects.select_related("parent").filter(
                status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE],
                type__in=[
                    Node.NodeType.GOAL,
                    Node.NodeType.PROJECT,
                    Node.NodeType.TASK,
                    Node.NodeType.SUB_TASK,
                ],
            ),
        )
        type_order = cls.low_energy_type_order if low_energy_today else cls.normal_type_order
        return sorted(
            nodes,
            key=lambda item: (
                type_order.get(item.type, 9),
                cls.goal_status_order.get(item.status, 9),
                item.created_at,
            ) if low_energy_today else (
                cls.goal_status_order.get(item.status, 9),
                type_order.get(item.type, 9),
                item.created_at,
            ),
        )

    @staticmethod
    def _serialize_node(node):
        if not node:
            return None
        return {
            "id": str(node.id),
            "title": node.title,
            "type": node.type,
            "status": node.status,
            "parent_title": node.parent.title if node.parent else None,
        }

    @staticmethod
    def _serialize_marketing_action(action):
        if not action:
            return None
        return {
            "id": str(action.id),
            "action": action.action,
            "platform": action.platform,
            "follow_up_date": action.follow_up_date.isoformat() if action.follow_up_date else None,
        }

    @classmethod
    def _work_suggestion(cls, *, candidates, used_goal_ids, low_energy_today):
        for candidate in candidates:
            if candidate.id in used_goal_ids:
                continue

            used_goal_ids.add(candidate.id)
            if low_energy_today and candidate.type in {Node.NodeType.TASK, Node.NodeType.SUB_TASK}:
                reason = "Low energy today, so a lighter available work item was pulled forward."
            elif low_energy_today:
                reason = "Energy is low today, and this is still the strongest available work target."
            else:
                reason = "This is the highest-priority available work item right now."

            return {
                "kind": "goal_node",
                "reason": reason,
                "goal_node": cls._serialize_node(candidate),
                "marketing_action": None,
            }, None

        fallback_reason = (
            "Low energy today, so no additional work suggestion was forced into this slot."
            if low_energy_today
            else "No available goal or task is ready for this work slot right now."
        )
        return None, fallback_reason

    @classmethod
    def _marketing_suggestion(cls, *, due_follow_ups, used_marketing_ids):
        for action in due_follow_ups:
            if action.id in used_marketing_ids:
                continue

            used_marketing_ids.add(action.id)
            return {
                "kind": "marketing_follow_up",
                "reason": "A follow-up is due, so this slot is reserved for closing the loop.",
                "goal_node": None,
                "marketing_action": cls._serialize_marketing_action(action),
            }, None

        return None, "No marketing follow-up is due right now."

    @classmethod
    def _suggestion_for_block(
        cls,
        *,
        block,
        low_energy_today,
        candidates,
        used_goal_ids,
        due_follow_ups,
        used_marketing_ids,
    ):
        if block.is_fixed:
            return None, "This is a fixed anchor and should not be auto-replaced."
        if not block.is_adjustable:
            return None, "This slot is intentionally kept manual."

        if block.type == ScheduleBlock.BlockType.WORK:
            suggestion, fallback_reason = cls._work_suggestion(
                candidates=candidates,
                used_goal_ids=used_goal_ids,
                low_energy_today=low_energy_today,
            )
            return suggestion, fallback_reason or suggestion["reason"]

        if block.type == ScheduleBlock.BlockType.MARKETING:
            suggestion, fallback_reason = cls._marketing_suggestion(
                due_follow_ups=due_follow_ups,
                used_marketing_ids=used_marketing_ids,
            )
            return suggestion, fallback_reason or suggestion["reason"]

        return None, "No automated suggestion is configured for this block type."

    @classmethod
    def _serialize_log(cls, log):
        if not log:
            return None
        return {
            "id": str(log.id),
            "date": log.date.isoformat(),
            "status": log.status,
            "actual_time": log.actual_time.isoformat() if log.actual_time else None,
            "note": log.note,
            "task_node": cls._serialize_node(log.task_node),
        }

    @classmethod
    def payload(cls, reference_date=None):
        reference_date = reference_date or timezone.localdate()
        template = cls._active_template()
        health_summary = HealthSummaryService.summary(reference_date)
        overwhelm_summary = OverwhelmService.summary(reference_date)

        if not template:
            return {
                "date": reference_date.isoformat(),
                "template": None,
                "low_energy_today": health_summary["low_energy_today"],
                "reduced_mode": overwhelm_summary["reduced_mode"],
                "notes": [],
                "summary": {
                    "done_count": 0,
                    "late_count": 0,
                    "partial_count": 0,
                    "skipped_count": 0,
                    "pending_count": 0,
                    "due_follow_ups_count": 0,
                },
                "blocks": [],
            }

        due_follow_ups = list(
            MarketingAction.objects.filter(
                follow_up_done=False,
                follow_up_date__lte=reference_date,
            ).select_related("goal").order_by("follow_up_date", "-date", "created_at"),
        )
        logs = {
            log.block_id: log
            for log in ScheduleLog.objects.select_related("task_node", "block").filter(
                date=reference_date,
                block__template=template,
            )
        }
        candidates = cls._available_goal_nodes(health_summary["low_energy_today"])
        used_goal_ids = set()
        used_marketing_ids = set()

        blocks_payload = []
        for block in template.blocks.all().order_by("sort_order", "time"):
            suggestion, suggestion_reason = cls._suggestion_for_block(
                block=block,
                low_energy_today=health_summary["low_energy_today"],
                candidates=candidates,
                used_goal_ids=used_goal_ids,
                due_follow_ups=due_follow_ups,
                used_marketing_ids=used_marketing_ids,
            )

            blocks_payload.append(
                {
                    "id": str(block.id),
                    "label": block.label,
                    "type": block.type,
                    "time": block.time.strftime("%H:%M"),
                    "is_fixed": block.is_fixed,
                    "is_adjustable": block.is_adjustable,
                    "duration_mins": block.duration_mins,
                    "sort_order": block.sort_order,
                    "log": cls._serialize_log(logs.get(block.id)),
                    "suggestion": suggestion,
                    "suggestion_reason": suggestion_reason,
                },
            )

        status_counts = {
            ScheduleLog.LogStatus.DONE: 0,
            ScheduleLog.LogStatus.LATE: 0,
            ScheduleLog.LogStatus.PARTIAL: 0,
            ScheduleLog.LogStatus.SKIPPED: 0,
        }
        for log in logs.values():
            if log.status in status_counts:
                status_counts[log.status] += 1

        notes = []
        if overwhelm_summary["reduced_mode"]:
            notes.append("Reduced mode is active, so keep the day narrow and honest.")
        if health_summary["low_energy_today"]:
            notes.append("Energy is low today, so lighter work is favored in adjustable slots.")
        if due_follow_ups:
            notes.append(f"{len(due_follow_ups)} marketing follow-up item(s) are due.")

        return {
            "date": reference_date.isoformat(),
            "template": {
                "id": str(template.id),
                "name": template.name,
                "is_active": template.is_active,
            },
            "low_energy_today": health_summary["low_energy_today"],
            "reduced_mode": overwhelm_summary["reduced_mode"],
            "notes": notes,
            "summary": {
                "done_count": status_counts[ScheduleLog.LogStatus.DONE],
                "late_count": status_counts[ScheduleLog.LogStatus.LATE],
                "partial_count": status_counts[ScheduleLog.LogStatus.PARTIAL],
                "skipped_count": status_counts[ScheduleLog.LogStatus.SKIPPED],
                "pending_count": len(blocks_payload) - sum(status_counts.values()),
                "due_follow_ups_count": len(due_follow_ups),
            },
            "blocks": blocks_payload,
        }


class ScheduleReviewService:
    """Assemble schedule-specific inputs for weekly review generation."""

    @classmethod
    def weekly_summary(cls, reference_date=None):
        reference_date = reference_date or timezone.localdate()
        week_start = reference_date - timedelta(days=6)
        skipped = (
            ScheduleLog.objects.filter(
                date__range=(week_start, reference_date),
                status=ScheduleLog.LogStatus.SKIPPED,
            )
            .values("block__label")
            .order_by("block__label")
        )

        counts = {}
        for item in skipped:
            label = item["block__label"]
            counts[label] = counts.get(label, 0) + 1

        repeated_skips = [
            {"label": label, "count": count}
            for label, count in counts.items()
            if count >= 3
        ]
        repeated_skips.sort(key=lambda item: (-item["count"], item["label"]))

        return {
            "week_start": week_start.isoformat(),
            "week_end": reference_date.isoformat(),
            "repeated_skips": repeated_skips,
            "total_done_count": ScheduleLog.objects.filter(
                date__range=(week_start, reference_date),
                status=ScheduleLog.LogStatus.DONE,
            ).count(),
            "total_skipped_count": ScheduleLog.objects.filter(
                date__range=(week_start, reference_date),
                status=ScheduleLog.LogStatus.SKIPPED,
            ).count(),
        }

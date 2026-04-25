# [AR] خدمة القرارات - تعثر على القرارات التي تحتاج مراجعة نتيجة
# [EN] Decision service - finds decisions that are due for outcome review

from analytics.models.decision_log import DecisionLog


class DecisionService:
    """Read helpers for decision-review workflows."""

    @staticmethod
    def due_for_review(reference_date):
        # [AR] المراجعة مستحقة عندما يحين تاريخ النتيجة ولا توجد نتيجة مسجلة
        # [EN] Review is due when the outcome date has passed and no result is recorded
        return DecisionLog.objects.filter(
            outcome_date__lte=reference_date,
            outcome_result="",
        )

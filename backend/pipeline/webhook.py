"""Webhook endpoint for receiving opportunities from the n8n scraper.

The n8n pipeline scrapes Upwork/Freelancer every 6 hours, scores each
opportunity against Mohamed's profile using the AI layer, and POSTs
the result here. This endpoint validates the payload and creates an
Opportunity record if it doesn't already exist.

Expected payload from n8n:
{
    "name": "string",
    "platform": "Upwork" | "Freelancer" | "Referral" | "Direct" | "Other",
    "description": "string",
    "budget": "string (optional)",
    "fit_score": 0-100 (optional, set by AI before posting),
    "fit_reasoning": "string (optional)",
    "date_found": "YYYY-MM-DD"
}
"""
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline.models import Opportunity
from pipeline.serializers import OpportunitySerializer
from pipeline.services import OpportunityLifecycleService

logger = logging.getLogger(__name__)


class OpportunityWebhookView(APIView):
    """Receives scored opportunities from the n8n scraper pipeline.

    POST /api/pipeline/webhook/opportunities/

    Deduplicates by (name, platform, date_found) — if the same opportunity
    is posted twice it is ignored and a 200 is returned (not a 201).
    """

    def post(self, request):
        """Accept a new opportunity from n8n and create it if not a duplicate."""
        # Deduplicate: same name + platform + date_found = same opportunity
        existing = Opportunity.objects.filter(
            name=request.data.get("name", ""),
            platform=request.data.get("platform", ""),
            date_found=request.data.get("date_found"),
        ).first()

        if existing:
            logger.info(
                "Webhook: duplicate opportunity skipped — %s (%s)",
                existing.name,
                existing.platform,
            )
            return Response(
                {"status": "duplicate", "id": str(existing.id)},
                status=status.HTTP_200_OK,
            )

        serializer = OpportunitySerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Webhook: invalid payload — %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        opportunity = serializer.save()
        OpportunityLifecycleService.enrich(opportunity)

        logger.info(
            "Webhook: opportunity created — %s (fit_score=%s)",
            opportunity.name,
            opportunity.fit_score,
        )
        return Response(
            {"status": "created", "id": str(opportunity.id)},
            status=status.HTTP_201_CREATED,
        )

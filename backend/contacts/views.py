"""Views for the Contacts domain.

Endpoints:
  /api/contacts/contacts/                      — CRUD
  /api/contacts/due-followups/                 — contacts with next_followup <= today
  /api/contacts/interactions/                  — CRUD for ContactInteraction
  /api/contacts/contacts/<pk>/gmail-threads/   — recent Gmail threads for a contact
"""
import datetime

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from contacts.models import Contact, ContactInteraction
from contacts.serializers import ContactInteractionSerializer, ContactSerializer


class ContactViewSet(ModelViewSet):
    """Full CRUD for Contact records."""

    serializer_class = ContactSerializer

    def get_queryset(self):
        qs = Contact.objects.select_related("linked_node", "linked_opportunity").prefetch_related("interactions")
        relation = self.request.query_params.get("relation")
        if relation:
            qs = qs.filter(relation=relation)
        node_id = self.request.query_params.get("linked_node")
        if node_id:
            qs = qs.filter(linked_node_id=node_id)
        crm_stage = self.request.query_params.get("crm_stage")
        if crm_stage:
            qs = qs.filter(crm_stage=crm_stage)
        return qs


class DueFollowupsView(APIView):
    """Return contacts where next_followup <= today, ordered by most overdue first."""

    def get(self, request):
        today = datetime.date.today()
        contacts = Contact.objects.filter(
            next_followup__lte=today,
        ).order_by("next_followup")
        serializer = ContactSerializer(contacts, many=True)
        return Response({"results": serializer.data, "count": contacts.count()})


class ContactGmailView(APIView):
    """Return recent Gmail threads for a contact identified by pk.

    GET /api/contacts/contacts/<pk>/gmail-threads/

    Requires the contact to have a non-empty email field and
    GOOGLE_REFRESH_TOKEN to include the gmail.readonly scope.
    Returns an empty list gracefully when Gmail is not configured.
    """

    def get(self, request, pk):
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response({"error": "Contact not found."}, status=404)

        if not contact.email:
            return Response(
                {"threads": [], "email": "", "note": "No email address on this contact."}
            )

        from contacts.gmail_service import get_gmail_threads  # noqa: PLC0415

        threads = get_gmail_threads(contact.email)
        return Response({"threads": threads, "email": contact.email})


class ContactInteractionViewSet(ModelViewSet):
    """CRUD for ContactInteraction — log and view interactions per contact."""

    serializer_class = ContactInteractionSerializer
    pagination_class = None

    def get_queryset(self):
        qs = ContactInteraction.objects.select_related("contact")
        contact_id = self.request.query_params.get("contact")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)
        return qs

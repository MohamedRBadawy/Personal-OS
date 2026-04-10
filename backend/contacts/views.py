"""Views for the Contacts domain.

Endpoints:
  /api/contacts/contacts/          — CRUD
  /api/contacts/due-followups/     — contacts with next_followup <= today
  /api/contacts/interactions/      — CRUD for ContactInteraction
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

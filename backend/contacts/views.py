"""Views for the Contacts domain.

Endpoints:
  /api/contacts/contacts/          — CRUD
  /api/contacts/due-followups/     — contacts with next_followup <= today
"""
import datetime

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from contacts.models import Contact
from contacts.serializers import ContactSerializer


class ContactViewSet(ModelViewSet):
    """Full CRUD for Contact records."""

    serializer_class = ContactSerializer

    def get_queryset(self):
        qs = Contact.objects.select_related("linked_node")
        relation = self.request.query_params.get("relation")
        if relation:
            qs = qs.filter(relation=relation)
        node_id = self.request.query_params.get("linked_node")
        if node_id:
            qs = qs.filter(linked_node_id=node_id)
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

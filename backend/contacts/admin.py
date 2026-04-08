from django.contrib import admin
from contacts.models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ["name", "relation", "company", "last_contact", "next_followup", "followup_overdue"]
    list_filter = ["relation"]
    search_fields = ["name", "company", "notes"]
    ordering = ["name"]

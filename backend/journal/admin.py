from django.contrib import admin

from journal.models import JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ["date", "created_at"]
    search_fields = ["date", "mood_note", "gratitude", "wins", "tomorrow_focus"]
    ordering = ["-date"]

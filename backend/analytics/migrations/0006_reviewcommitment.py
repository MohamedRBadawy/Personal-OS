# Generated for US6 weekly review commitment accountability.

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0005_decisionlog_tradeoff_fields"),
        ("goals", "0005_add_routine_block"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReviewCommitment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, help_text="Unique identifier for this record.", primary_key=True, serialize=False)),
                ("action_type", models.CharField(choices=[("stop", "Stop"), ("change", "Change"), ("start", "Start")], max_length=10)),
                ("description", models.TextField()),
                ("was_kept", models.BooleanField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "checked_in_review",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="checked_commitments",
                        to="analytics.weeklyreview",
                    ),
                ),
                (
                    "node_update",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="review_commitments",
                        to="goals.node",
                    ),
                ),
                (
                    "review",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="commitments",
                        to="analytics.weeklyreview",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
    ]

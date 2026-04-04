from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("goals", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="node",
            name="due_date",
            field=models.DateField(
                blank=True,
                help_text="Optional due date for task and sub-task items.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="node",
            name="manual_priority",
            field=models.CharField(
                blank=True,
                choices=[("high", "High"), ("medium", "Medium"), ("low", "Low")],
                help_text="Optional manual priority for task and sub-task items.",
                max_length=10,
                null=True,
            ),
        ),
    ]

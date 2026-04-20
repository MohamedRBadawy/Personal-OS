import uuid

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("health", "0008_workoutexercise_muscles"),
    ]

    operations = [
        migrations.CreateModel(
            name="HealthGoalProfile",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("primary_goals", models.JSONField(blank=True, default=list, help_text="Up to 3 selected primary health goals.")),
                (
                    "sleep_hours_target",
                    models.DecimalField(
                        decimal_places=1,
                        default=7.5,
                        max_digits=4,
                        validators=[django.core.validators.MinValueValidator(4), django.core.validators.MaxValueValidator(12)],
                    ),
                ),
                (
                    "weekly_workouts_target",
                    models.PositiveIntegerField(
                        default=4,
                        validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(14)],
                    ),
                ),
                (
                    "protein_g_target",
                    models.PositiveIntegerField(
                        default=150,
                        validators=[django.core.validators.MinValueValidator(40), django.core.validators.MaxValueValidator(350)],
                    ),
                ),
                (
                    "body_goal",
                    models.CharField(
                        choices=[("lose_fat", "Lose fat"), ("maintain", "Maintain"), ("gain_muscle", "Gain muscle")],
                        default="maintain",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "health goal profile",
                "verbose_name_plural": "health goal profiles",
            },
        ),
        migrations.AddField(
            model_name="habit",
            name="health_domain",
            field=models.CharField(
                choices=[
                    ("sleep", "Sleep"),
                    ("movement", "Movement"),
                    ("nutrition", "Nutrition"),
                    ("recovery", "Recovery"),
                    ("mental", "Mental"),
                    ("general", "General"),
                ],
                default="general",
                help_text="Which health pillar this habit supports, if any.",
                max_length=20,
            ),
        ),
    ]

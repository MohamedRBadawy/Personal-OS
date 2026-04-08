from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("schedule", "0004_routineblock_detail_fields")]

    operations = [
        migrations.AddField(
            model_name="routineblock",
            name="importance",
            field=models.CharField(
                default="should",
                help_text="must | should | nice — weights the completion score",
                max_length=10,
            ),
        ),
    ]

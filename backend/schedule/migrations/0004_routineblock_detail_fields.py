"""Add type-specific detail fields to RoutineBlock."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('schedule', '0003_add_routine_block'),
    ]

    operations = [
        migrations.AddField(
            model_name='routineblock',
            name='description',
            field=models.TextField(blank=True, default='',
                                   help_text='Why this block exists; personal notes.'),
        ),
        migrations.AddField(
            model_name='routineblock',
            name='days_of_week',
            field=models.CharField(
                blank=True, default='', max_length=7,
                help_text='Empty = every day. Digits 1–7 (1=Mon…7=Sun). E.g. "135".',
            ),
        ),
        migrations.AddField(
            model_name='routineblock',
            name='location',
            field=models.CharField(blank=True, default='', max_length=20,
                                   help_text='mosque | home | online'),
        ),
        migrations.AddField(
            model_name='routineblock',
            name='target',
            field=models.CharField(blank=True, default='', max_length=200,
                                   help_text="e.g. '1 juz Quran', 'adhkar'"),
        ),
        migrations.AddField(
            model_name='routineblock',
            name='exercise_type',
            field=models.CharField(blank=True, default='', max_length=20,
                                   help_text='cardio | strength | yoga | hiit | swimming | cycling'),
        ),
        migrations.AddField(
            model_name='routineblock',
            name='intensity',
            field=models.CharField(blank=True, default='', max_length=10,
                                   help_text='low | medium | high'),
        ),
        migrations.AddField(
            model_name='routineblock',
            name='focus_area',
            field=models.CharField(blank=True, default='', max_length=20,
                                   help_text='deep_work | email | calls | admin | outreach'),
        ),
        migrations.AddField(
            model_name='routineblock',
            name='deliverable',
            field=models.CharField(blank=True, default='', max_length=200,
                                   help_text='Expected output for this work block.'),
        ),
    ]

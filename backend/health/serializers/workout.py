"""Serializers for WorkoutSession, WorkoutExercise, and SetLog."""
from rest_framework import serializers

from health.models.workout import SetLog, WorkoutExercise, WorkoutSession


class SetLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SetLog
        fields = "__all__"
        read_only_fields = ["id"]


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    sets = SetLogSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutExercise
        fields = "__all__"
        read_only_fields = ["id"]

    def validate_name(self, value):
        """Normalize exercise name to title case."""
        return value.strip().title() if value else value

    def create(self, validated_data):
        """Auto-infer primary_muscle and secondary_muscles from the exercise name if not provided."""
        from health.analytics import ExerciseAnalyticsService
        if not validated_data.get('primary_muscle'):
            primary, secondary = ExerciseAnalyticsService.infer_muscles(
                validated_data.get('name', '')
            )
            if primary:
                validated_data['primary_muscle'] = primary
            if secondary and not validated_data.get('secondary_muscles'):
                validated_data['secondary_muscles'] = secondary
        return super().create(validated_data)


class WorkoutSessionSerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutSession
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

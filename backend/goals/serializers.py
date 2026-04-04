"""Serializers for dependency-aware goal nodes."""
from django.utils import timezone
from rest_framework import serializers

from goals.models import Node
from goals.services import NodeStatusService, TaskRecommendationService


class NodeSerializer(serializers.ModelSerializer):
    """Serializer for CRUD operations on nodes."""

    deps = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Node.objects.all(), required=False,
    )
    progress_pct = serializers.SerializerMethodField(read_only=True)
    parent_title = serializers.SerializerMethodField(read_only=True)
    dependent_count = serializers.SerializerMethodField(read_only=True)
    blocked_by_titles = serializers.SerializerMethodField(read_only=True)
    recommended_tool = serializers.SerializerMethodField(read_only=True)
    tool_reasoning = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Node
        fields = [
            "id",
            "code",
            "title",
            "type",
            "category",
            "status",
            "parent",
            "deps",
            "notes",
            "due_date",
            "manual_priority",
            "created_at",
            "updated_at",
            "completed_at",
            "progress_pct",
            "parent_title",
            "dependent_count",
            "blocked_by_titles",
            "recommended_tool",
            "tool_reasoning",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "completed_at",
            "progress_pct",
            "parent_title",
            "dependent_count",
            "blocked_by_titles",
            "recommended_tool",
            "tool_reasoning",
        ]

    def get_progress_pct(self, obj):
        return NodeStatusService.progress_pct(obj)

    def get_parent_title(self, obj):
        return obj.parent.title if obj.parent else None

    def get_dependent_count(self, obj):
        return obj.dependents.exclude(status=Node.Status.DONE).count()

    def get_blocked_by_titles(self, obj):
        return list(obj.deps.exclude(status=Node.Status.DONE).values_list("title", flat=True))

    def get_recommended_tool(self, obj):
        return TaskRecommendationService.recommend(obj)[0]

    def get_tool_reasoning(self, obj):
        return TaskRecommendationService.recommend(obj)[1]

    def validate(self, attrs):
        instance = self.instance
        parent = attrs.get("parent", instance.parent if instance else None)
        deps = attrs.get("deps", list(instance.deps.all()) if instance else [])
        node_type = attrs.get("type", instance.type if instance else None)
        due_date = attrs.get("due_date", instance.due_date if instance else None)
        manual_priority = attrs.get("manual_priority", instance.manual_priority if instance else None)
        NodeStatusService.validate_parent(instance, parent)
        if instance:
            NodeStatusService.validate_dependencies(instance, deps)
        if node_type not in {Node.NodeType.TASK, Node.NodeType.SUB_TASK}:
            if due_date is not None:
                raise serializers.ValidationError(
                    {"due_date": "Due dates are only supported on task and sub-task nodes."},
                )
            if manual_priority is not None:
                raise serializers.ValidationError(
                    {"manual_priority": "Manual priority is only supported on task and sub-task nodes."},
                )
        return attrs

    def create(self, validated_data):
        deps = validated_data.pop("deps", [])
        if validated_data.get("status") == Node.Status.DONE:
            validated_data["completed_at"] = timezone.now()

        node = Node.objects.create(**validated_data)
        if deps:
            NodeStatusService.validate_dependencies(node, deps)
            node.deps.set(deps)
        NodeStatusService.refresh_all()
        return node

    def update(self, instance, validated_data):
        deps = validated_data.pop("deps", None)
        parent = validated_data.get("parent", instance.parent)
        NodeStatusService.validate_parent(instance, parent)
        if deps is not None:
            NodeStatusService.validate_dependencies(instance, deps)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if instance.status == Node.Status.DONE and not instance.completed_at:
            instance.completed_at = timezone.now()
        if instance.status != Node.Status.DONE:
            instance.completed_at = None

        instance.save()
        if deps is not None:
            instance.deps.set(deps)
        NodeStatusService.refresh_all()
        return instance


class NodeTreeSerializer(NodeSerializer):
    """Recursive serializer for the goal tree endpoint."""

    children = serializers.SerializerMethodField()

    class Meta(NodeSerializer.Meta):
        fields = NodeSerializer.Meta.fields

    def get_children(self, obj):
        children = obj.children.all().order_by("created_at")
        return NodeTreeSerializer(children, many=True).data

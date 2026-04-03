"""Serializers for dependency-aware goal nodes."""
from django.utils import timezone
from rest_framework import serializers

from goals.models import Node
from goals.services import NodeStatusService


class NodeSerializer(serializers.ModelSerializer):
    """Serializer for CRUD operations on nodes."""

    deps = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Node.objects.all(), required=False,
    )
    progress_pct = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Node
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "completed_at", "progress_pct"]

    def get_progress_pct(self, obj):
        return NodeStatusService.progress_pct(obj)

    def validate(self, attrs):
        instance = self.instance
        parent = attrs.get("parent", instance.parent if instance else None)
        deps = attrs.get("deps", list(instance.deps.all()) if instance else [])
        NodeStatusService.validate_parent(instance, parent)
        if instance:
            NodeStatusService.validate_dependencies(instance, deps)
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

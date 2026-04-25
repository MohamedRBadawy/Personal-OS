# [AR] مسلسل التزامات المراجعة — يعرض الالتزام واسم العقدة المرتبطة
# [EN] Review commitment serializer — exposes commitment data and linked node title
from rest_framework import serializers

from analytics.models.review_commitment import ReviewCommitment


class ReviewCommitmentSerializer(serializers.ModelSerializer):
    """Serializer for weekly review stop/change/start commitments."""

    node_update_title = serializers.SerializerMethodField()

    class Meta:
        model = ReviewCommitment
        fields = [
            "id",
            "review",
            "action_type",
            "description",
            "node_update",
            "node_update_title",
            "checked_in_review",
            "was_kept",
            "created_at",
        ]
        read_only_fields = ["id", "review", "node_update_title", "checked_in_review", "created_at"]

    def get_node_update_title(self, obj):
        return obj.node_update.title if obj.node_update else None

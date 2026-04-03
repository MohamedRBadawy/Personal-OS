"""Tests for goal dependency rules and progress logic."""
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from goals.models import Node
from goals.serializers import NodeSerializer
from goals.services import NodeStatusService


class GoalRuleTests(TestCase):
    """Coverage for node validation and dependency recalculation."""

    def test_descendant_dependency_is_rejected(self):
        parent = Node.objects.create(
            title="Parent",
            type=Node.NodeType.GOAL,
            category=Node.Category.LIFE,
            status=Node.Status.ACTIVE,
        )
        child = Node.objects.create(
            title="Child",
            type=Node.NodeType.PROJECT,
            category=Node.Category.LIFE,
            status=Node.Status.ACTIVE,
            parent=parent,
        )

        serializer = NodeSerializer(instance=parent, data={"deps": [str(child.id)]}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn("deps", serializer.errors)

    def test_done_dependency_unblocks_dependent(self):
        dependency = Node.objects.create(
            title="Dependency",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.ACTIVE,
        )
        dependent = Node.objects.create(
            title="Dependent",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
        )
        dependent.deps.set([dependency])
        NodeStatusService.refresh_all()

        dependent.refresh_from_db()
        self.assertEqual(dependent.status, Node.Status.BLOCKED)

        dependency.status = Node.Status.DONE
        dependency.save()
        NodeStatusService.refresh_all()

        dependent.refresh_from_db()
        self.assertEqual(dependent.status, Node.Status.AVAILABLE)

    def test_progress_pct_only_counts_direct_children(self):
        goal = Node.objects.create(
            title="Main Goal",
            type=Node.NodeType.GOAL,
            category=Node.Category.CAREER,
            status=Node.Status.ACTIVE,
        )
        done_child = Node.objects.create(
            title="Done Child",
            type=Node.NodeType.PROJECT,
            category=Node.Category.CAREER,
            status=Node.Status.DONE,
            parent=goal,
        )
        open_child = Node.objects.create(
            title="Open Child",
            type=Node.NodeType.PROJECT,
            category=Node.Category.CAREER,
            status=Node.Status.ACTIVE,
            parent=goal,
        )
        Node.objects.create(
            title="Grandchild",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.DONE,
            parent=open_child,
        )

        self.assertEqual(NodeStatusService.progress_pct(goal), 50)
        self.assertEqual(done_child.status, Node.Status.DONE)


class GoalReadModelTests(TestCase):
    """Coverage for goal tree and map read models."""

    def setUp(self):
        self.client = APIClient()

    def test_goal_map_endpoint_returns_nodes_and_edges(self):
        goal = Node.objects.create(
            code="g2",
            title="Reach EUR 1,000/month independent income",
            type=Node.NodeType.GOAL,
            category=Node.Category.FINANCE,
            status=Node.Status.ACTIVE,
        )
        project = Node.objects.create(
            code="p1",
            title="Build outbound pipeline",
            type=Node.NodeType.PROJECT,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
            parent=goal,
        )
        task = Node.objects.create(
            code="t1",
            title="Send outreach messages",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
            parent=project,
        )
        task.deps.set([goal])
        NodeStatusService.refresh_all()

        response = self.client.get("/api/goals/nodes/map/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["nodes"]), 3)
        self.assertEqual(len(response.data["edges"]), 3)
        self.assertEqual(response.data["summary"]["goal_count"], 1)
        self.assertEqual(response.data["summary"]["project_count"], 1)
        self.assertEqual(response.data["summary"]["task_count"], 1)
        self.assertTrue(any(edge["kind"] == "dependency" for edge in response.data["edges"]))

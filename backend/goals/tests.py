"""Tests for goal dependency rules and progress logic."""
from datetime import date, timedelta

from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from goals.models import GoalAttachmentProfile, Node
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

    def test_task_nodes_accept_due_dates_and_manual_priority(self):
        serializer = NodeSerializer(
            data={
                "title": "Build command center backend",
                "type": Node.NodeType.TASK,
                "category": Node.Category.CAREER,
                "status": Node.Status.ACTIVE,
                "due_date": date.today().isoformat(),
                "manual_priority": Node.ManualPriority.HIGH,
                "notes": "Backend feature and API work.",
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        node = serializer.save()
        self.assertEqual(node.manual_priority, Node.ManualPriority.HIGH)
        self.assertEqual(serializer.data["due_date"], date.today().isoformat())
        self.assertEqual(serializer.data["recommended_tool"], "Codex")

    def test_non_task_nodes_reject_due_dates_and_manual_priority(self):
        serializer = NodeSerializer(
            data={
                "title": "North star goal",
                "type": Node.NodeType.GOAL,
                "category": Node.Category.LIFE,
                "status": Node.Status.ACTIVE,
                "due_date": date.today().isoformat(),
                "manual_priority": Node.ManualPriority.HIGH,
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("due_date", serializer.errors)

    def test_goal_map_exposes_task_planning_fields(self):
        goal = Node.objects.create(
            code="g1",
            title="Reach independent income target",
            type=Node.NodeType.GOAL,
            category=Node.Category.FINANCE,
            status=Node.Status.ACTIVE,
        )
        task = Node.objects.create(
            code="t1",
            title="Build command center backend",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
            parent=goal,
            due_date=date.today() + timedelta(days=2),
            manual_priority=Node.ManualPriority.MEDIUM,
        )
        task.deps.set([goal])

        response = self.client.get("/api/goals/nodes/map/")

        self.assertEqual(response.status_code, 200)
        map_task = next(item for item in response.data["nodes"] if item["id"] == str(task.id))
        self.assertEqual(map_task["due_date"], task.due_date.isoformat())
        self.assertEqual(map_task["manual_priority"], Node.ManualPriority.MEDIUM)
        self.assertEqual(map_task["recommended_tool"], "Codex")
        self.assertTrue(map_task["tool_reasoning"])

    def test_goal_context_includes_attachment_suggestions(self):
        task = Node.objects.create(
            title="Build outbound system",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
            notes="Client outreach and pipeline work.",
        )

        response = self.client.get(f"/api/goals/nodes/{task.id}/context/")

        self.assertEqual(response.status_code, 200)
        suggestion_keys = {item["key"] for item in response.data["attachment_suggestions"]}
        self.assertIn("process", suggestion_keys)
        self.assertIn("tools", suggestion_keys)
        self.assertIn("marketing_actions", suggestion_keys)

    def test_attachment_profile_endpoint_saves_and_exposes_support_layers(self):
        task = Node.objects.create(
            title="Build outbound system",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
        )

        create_response = self.client.post(
            "/api/goals/attachments/",
            {
                "node": str(task.id),
                "recommended_layers": ["process", "tools"],
                "habits": ["Daily outreach"],
                "marketing_actions": ["Follow up with warm leads"],
                "process_notes": "Start with the overview endpoint.",
                "tools": ["Codex", "Django shell"],
                "learning_path": ["Refine the read models"],
                "supporting_people": ["Ahmed Mentor"],
            },
            format="json",
        )
        context_response = self.client.get(f"/api/goals/nodes/{task.id}/context/")

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(GoalAttachmentProfile.objects.count(), 1)
        self.assertEqual(context_response.status_code, 200)
        self.assertEqual(context_response.data["attachment_profile"]["habits"], ["Daily outreach"])
        self.assertEqual(context_response.data["attachment_profile"]["tools"], ["Codex", "Django shell"])

    def test_active_context_endpoint_returns_safe_capacity_payload(self):
        for index in range(3):
            Node.objects.create(
                title=f"Active goal {index + 1}",
                type=Node.NodeType.GOAL,
                category=Node.Category.CAREER,
                status=Node.Status.ACTIVE,
                progress=20,
            )
        Node.objects.create(
            title="Active task should not count",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.ACTIVE,
        )

        response = self.client.get("/api/goals/nodes/active-context/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["active_goal_count"], 3)
        self.assertEqual(len(response.data["active_goals"]), 3)
        self.assertEqual(response.data["max_safe_active"], 3)
        self.assertIn("Activating", response.data["recommendation"])

    def test_patch_to_active_includes_tradeoff_context(self):
        for index in range(3):
            Node.objects.create(
                title=f"Already active {index + 1}",
                type=Node.NodeType.GOAL,
                category=Node.Category.CAREER,
                status=Node.Status.ACTIVE,
            )
        target = Node.objects.create(
            title="New service offer",
            type=Node.NodeType.GOAL,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
        )

        response = self.client.patch(
            f"/api/goals/nodes/{target.id}/",
            {"status": Node.Status.ACTIVE},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["trade_off_context"]["active_count_before"], 3)
        self.assertEqual(response.data["trade_off_context"]["active_count_after"], 4)
        self.assertTrue(response.data["trade_off_context"]["exceeded_safe_limit"])

"""API view for the AI chat endpoint."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.chat_service import run_chat


class ChatView(APIView):
    """POST /api/core/chat/ — AI assistant with tool-use.

    Request body:
    {
        "messages": [
            {"role": "user", "content": "Log my sleep as 7.5 hours, quality 4"},
            {"role": "assistant", "content": "Done! Health log saved for today."},
            {"role": "user", "content": "Also mark cold shower as done"}
        ],
        "context": {"surface": "command_center"}
    }

    Response:
    {
        "reply": "Cold shower marked as done for today.",
        "actions": [
            {"tool": "mark_habit_done", "result": {"status": "marked done", "habit": "Cold shower"}}
        ],
        "affected_modules": ["health"]
    }
    """

    def post(self, request):
        """Run the agentic chat loop and return the AI reply + actions taken."""
        messages = request.data.get("messages", [])
        context = request.data.get("context")

        if not messages:
            return Response(
                {"error": "messages list is required and must not be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate message format
        for msg in messages:
            if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
                return Response(
                    {"error": "Each message must have 'role' and 'content' fields."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if msg["role"] not in ("user", "assistant"):
                return Response(
                    {"error": f"Invalid role '{msg['role']}'. Must be 'user' or 'assistant'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if context is not None and not isinstance(context, dict):
            return Response(
                {"error": "context must be an object when provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = run_chat(messages, context=context)
        return Response(result, status=status.HTTP_200_OK)

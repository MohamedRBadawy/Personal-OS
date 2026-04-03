"""API view for the AI chat endpoint.

Accepts the full conversation history and returns Claude's reply
plus a list of actions that were executed inside the app.
"""
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
        ]
    }

    Response:
    {
        "reply": "Cold shower marked as done for today.",
        "actions": [
            {"tool": "mark_habit_done", "result": {"status": "marked done", "habit": "Cold shower"}}
        ]
    }
    """

    def post(self, request):
        """Run the agentic chat loop and return the AI reply + actions taken."""
        messages = request.data.get("messages", [])

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

        result = run_chat(messages)
        return Response(result, status=status.HTTP_200_OK)

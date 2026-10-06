"""Request audit log: one line per HTTP request, written to db/audit.log.

Pure ASGI middleware, registered outermost so it sees every request, including
ones rejected by tenant/auth/RBAC. It never reads the request body or alters
the response; it only watches the status code go past. Any failure while
writing the log is swallowed so auditing can never break a request.

The log is truncated when this module is first imported (app startup), so each
run starts a fresh file, like store.json.
"""
import threading
from datetime import datetime, timezone
from http import HTTPStatus
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent.parent / "db" / "audit.log"

_lock = threading.Lock()
LOG_PATH.write_text("", encoding="utf-8")


def _status_phrase(code: int) -> str:
    try:
        return HTTPStatus(code).phrase
    except ValueError:
        return ""


def _user_id(scope) -> str:
    # Prefer the user the auth middleware actually resolved; an unknown or
    # missing X-User-Id is logged as "-" rather than trusting the raw header.
    user = scope.get("state", {}).get("user")
    return user["id"] if user else "-"


def _write(scope, status: int, at: datetime) -> None:
    client = scope.get("client")
    client_addr = f"{client[0]}:{client[1]}" if client else "-"
    path = scope.get("path", "")
    query = scope.get("query_string", b"").decode("latin-1")
    target = f"{path}?{query}" if query else path
    method = scope.get("method", "-")
    request_line = f'{method} {target} HTTP/{scope.get("http_version", "1.1")}'

    line = (
        f"{at:%Y-%m-%dT%H:%M:%SZ} | user={_user_id(scope)} | {method} | {status} | "
        f'{client_addr} - "{request_line}" {status} {_status_phrase(status)}\n'
    )
    with _lock, LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(line)


class AuditLogMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        at = datetime.now(timezone.utc)
        status = 500  # if the app raises before responding, that is what the client gets

        async def send_wrapper(message):
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            try:
                _write(scope, status, at)
            except Exception:
                pass

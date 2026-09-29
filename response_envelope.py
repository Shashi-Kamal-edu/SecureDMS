from __future__ import annotations

"""
Response envelope helpers.

Rather than a blanket ASGI middleware rewriting every response body (which
gets awkward with streaming file downloads), routes call `success()` to
wrap their payload, and a set of FastAPI exception handlers ensure errors
come back in the same `{success, message, error}` shape. This keeps
individual route handlers clean while guaranteeing a consistent contract
for the React/Axios frontend.
"""

from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def success(data: Any = None, message: str = "OK") -> dict:
    return {
        "success": True,
        "message": message,
        "data": jsonable_encoder(data),
    }


def error_body(message: str, error: str | None = None) -> dict:
    return {
        "success": False,
        "message": message,
        "error": error or message,
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(str(exc.detail), str(exc.detail)),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_body("Validation error.", str(exc.errors())),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_body("Internal server error.", str(exc)),
        )

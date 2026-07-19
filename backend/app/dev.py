"""Dev-server entry point exposed as ``uv run dev``.

Registered in ``[project.scripts]`` so the dev server starts without anyone having to
remember the uvicorn invocation or which module holds the ASGI app.
"""

from __future__ import annotations

import argparse
import os

import uvicorn

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000


def main() -> None:
    """Run the API with autoreload. Env vars supply defaults; flags override them."""
    parser = argparse.ArgumentParser(description="Start the MAG7 API dev server.")
    parser.add_argument("--host", default=os.environ.get("HOST", DEFAULT_HOST))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", DEFAULT_PORT)))
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable autoreload (useful when profiling or running under a debugger).",
    )
    args = parser.parse_args()

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
    )


if __name__ == "__main__":
    main()

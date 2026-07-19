.PHONY: install dev dev-backend dev-frontend check check-backend check-frontend clean

BACKEND_PY := backend/.venv/bin/python

install:
	cd backend && uv venv && uv pip install -e '.[dev]'
	cd frontend && npm install

dev:
	@echo "Backend on :8000, frontend on :5173 — Ctrl-C stops both."
	@trap 'kill 0' INT TERM; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend:
	cd backend && .venv/bin/python -m uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

check: check-backend check-frontend

check-backend:
	cd backend && .venv/bin/python -m pytest -q
	cd backend && .venv/bin/python -m mypy

check-frontend:
	cd frontend && npm test
	cd frontend && npm run typecheck
	cd frontend && npm run build

clean:
	rm -rf backend/.venv backend/.pytest_cache frontend/node_modules frontend/dist
	find backend -name __pycache__ -type d -exec rm -rf {} +

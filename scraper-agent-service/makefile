SHELL := /bin/bash
VENV_NAME = .venv
VENV = $(VENV_NAME)/bin/activate

setup:
	python3 -m venv $(VENV_NAME) && \
	source $(VENV) && \
	pip install -r requirements.txt && \
	sleep 1 && \
	echo && \
	echo "********************************************" && \
	echo "✅ Setup Complete" && \
	echo "********************************************"

run:
	source $(VENV) && \
	uvicorn src.app:app --reload --host 0.0.0.0 --port 8005

test:
	source $(VENV) && \
	pytest

scrape:
	@curl -s -X POST "http://127.0.0.1:8005/alerts/scrape?force=true" | json_pp 2>/dev/null || curl -X POST "http://127.0.0.1:8005/alerts/scrape?force=true"

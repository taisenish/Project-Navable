SHELL := /bin/bash
VENV_NAME = .venv
VENV = $(VENV_NAME)/bin/activate
PYTHON = $(VENV_NAME)/bin/python
FASTAPI = $(VENV_NAME)/bin/fastapi
UVICORN = $(VENV_NAME)/bin/uvicorn

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
	$(UVICORN) src.app:app --reload --host 127.0.0.1 --port 8000 && \
	sleep 1 && \
	echo && \
	echo "********************************************" && \
	echo "✅ Running at: http://127.0.0.1:8000/" && \
	echo "********************************************"

test:
	$(PYTHON) -m unittest discover -s tests

lint:
	$(PYTHON) -m compileall src tests

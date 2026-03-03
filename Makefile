SHELL := /bin/bash

.PHONY: run run-backend run-frontend setup setup-backend setup-frontend test lint

run:
	@set -euo pipefail; \
	trap 'kill 0' EXIT INT TERM; \
	$(MAKE) run-backend & \
	$(MAKE) run-frontend & \
	wait

run-backend:
	$(MAKE) -C backend run

run-frontend:
	cd frontend && npm run start

setup: setup-backend setup-frontend

setup-backend:
	$(MAKE) -C backend setup

setup-frontend:
	cd frontend && npm_config_cache=../.npm-cache npm install

test:
	$(MAKE) -C backend test
	cd frontend && npm run test

lint:
	$(MAKE) -C backend lint
	cd frontend && npm run lint

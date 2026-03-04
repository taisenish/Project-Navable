SHELL := /bin/bash

.PHONY: run run-backend run-frontend run-frontend-dev-client run-ios-dev run-ios-dev-client ios-check-install ios-launch-app setup setup-backend setup-frontend test lint

run:
	@set -euo pipefail; \
	trap 'kill 0' EXIT INT TERM; \
	$(MAKE) run-backend & \
	$(MAKE) run-frontend-dev-client & \
	wait

run-backend:
	$(MAKE) -C backend run

run-frontend:
	cd frontend && npm run start

run-frontend-dev-client:
	cd frontend && npx expo start --dev-client

run-ios-dev:
	cd frontend && npx expo run:ios

run-ios-dev-client:
	$(MAKE) run-ios-dev
	$(MAKE) run-frontend-dev-client

ios-check-install:
	xcrun simctl get_app_container booted com.navable.app app >/dev/null && echo "com.navable.app is installed" || (echo "com.navable.app is NOT installed on booted simulator" && exit 1)

ios-launch-app:
	xcrun simctl launch booted com.navable.app

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

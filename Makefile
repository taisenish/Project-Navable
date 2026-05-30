SHELL := /bin/bash

.PHONY: run run-backend run-frontend run-frontend-dev-client run-ios-dev run-ios-dev-client ios-check-install ios-launch-app setup setup-backend setup-frontend setup-scraper run-scraper scrape test lint map-extraction build-android-standalone build-ios-standalone run-simulation-local run-simulation-ios run-test-simulation-ios run-test-simulation-local

run:
	@set -euo pipefail; \
	trap 'kill 0' EXIT INT TERM; \
	$(MAKE) run-backend & \
	$(MAKE) run-frontend-dev-client & \
	$(MAKE) run-scraper & \
	wait

run-backend:
	$(MAKE) -C backend run

run-scraper:
	$(MAKE) -C scraper-agent-service run

map-extraction:
	cd map-extraction && make run

scrape:
	@echo "🔍 Triggering manual UW Emergency blog scrape..."
	@$(MAKE) -C scraper-agent-service scrape

run-frontend:
	cd frontend && npm run start

run-frontend-dev-client:
	cd frontend && npx expo start --dev-client

run-ios-dev:
	cd frontend && npx expo run:ios

run-ios-dev-client:
	$(MAKE) run-ios-dev
	$(MAKE) run-frontend-dev-client

run-simulation-local:
	@echo "Configuring frontend to use .env.development..."
	cp frontend/.env.development frontend/.env
	@if [ -f frontend/.env.development.local ]; then mv frontend/.env.development.local frontend/.env.development.local.bak; fi
	@trap 'if [ -f frontend/.env.development.local.bak ]; then mv frontend/.env.development.local.bak frontend/.env.development.local; fi' EXIT INT TERM; \
	cd frontend && npx expo start

run-simulation-ios:
	@echo "Configuring frontend to use .env.development..."
	cp frontend/.env.development frontend/.env
	@echo "Launching iOS Simulator with development config..."
	cd frontend && npx expo run:ios

ios-check-install:
	xcrun simctl get_app_container booted com.navable.app app >/dev/null && echo "com.navable.app is installed" || (echo "com.navable.app is NOT installed on booted simulator" && exit 1)

ios-launch-app:
	xcrun simctl launch booted com.navable.app

setup: setup-backend setup-frontend setup-scraper

setup-backend:
	$(MAKE) -C backend setup

setup-scraper:
	$(MAKE) -C scraper-agent-service setup

setup-frontend:
	cd frontend && npm_config_cache=../.npm-cache npm install

test:
	$(MAKE) -C backend test
	$(MAKE) -C scraper-agent-service test
	cd frontend && npm run test

lint:
	$(MAKE) -C backend lint
	cd frontend && npm run lint

kill-backend:
	kill -9 $(lsof -t -i:8000)

build-android-standalone:
	cd frontend && npm run build:android-standalone

build-ios-standalone:
	cd frontend && npm run build:ios-standalone

# ==============================================================================
# Automated Testing Targets (For Professor and Capstone Grading Evaluation)
# ==============================================================================

run-test-simulation-ios:
	@echo "Stopping any running Metro servers on port 8081..."
	@kill -9 $$(lsof -t -i :8081) 2>/dev/null || true
	@echo "Clearing Metro, Expo, and Xcode native build caches..."
	@rm -rf frontend/.expo
	@rm -rf frontend/node_modules/.cache
	@rm -rf frontend/ios/build
	@echo "Configuring frontend to use .env with Mary Gates Hall spoof..."
	@cp frontend/.env.development frontend/.env
	@echo "" >> frontend/.env
	@echo "EXPO_PUBLIC_SPOOF_LOCATION=47.6549,-122.3080" >> frontend/.env
	@if [ -f frontend/.env.development.local ]; then mv frontend/.env.development.local frontend/.env.development.local.bak; fi
	@trap 'if [ -f frontend/.env.development.local.bak ]; then mv frontend/.env.development.local.bak frontend/.env.development.local; fi' EXIT INT TERM; \
	cd frontend && npx expo run:ios

run-test-simulation-local:
	@echo "Stopping any running Metro servers on port 8081..."
	@kill -9 $$(lsof -t -i :8081) 2>/dev/null || true
	@echo "Clearing Metro and Expo build caches..."
	@rm -rf frontend/.expo
	@rm -rf frontend/node_modules/.cache
	@echo "Configuring frontend to use .env with remote Azure backend..."
	@cp frontend/.env.development frontend/.env
	@if [ -f frontend/.env.development.local ]; then mv frontend/.env.development.local frontend/.env.development.local.bak; fi
	@trap 'if [ -f frontend/.env.development.local.bak ]; then mv frontend/.env.development.local.bak frontend/.env.development.local; fi' EXIT INT TERM; \
	cd frontend && npx expo start
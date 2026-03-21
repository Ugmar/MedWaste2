.PHONY: help install dev up down logs clean lint format test db-init db-drop ps

# Variables
PYTHON := python3
PIP := pip3
DOCKER_COMPOSE := docker-compose
APP_NAME := medwaste

## install: Install Python dependencies
install:
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	$(PIP) install -r requirements.txt

## dev: Run FastAPI app in development mode (local)
dev:
	@echo "$(YELLOW)Starting FastAPI development server...$(NC)"
	$(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

## up: Start all Docker containers (docker-compose up)
up:
	@echo "Starting Docker containers...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "✓ Services are running$(NC)"
	@echo "API: http://localhost:8000$(NC)"
	@echo "PostgreSQL: localhost:5432$(NC)"

## down: Stop all Docker containers (docker-compose down)
down:
	@echo "Stopping Docker containers...$(NC)"
	$(DOCKER_COMPOSE) down

## logs: Display Docker container logs
logs:
	$(DOCKER_COMPOSE) logs -f

## logs-api: Display only API container logs
logs-api:
	$(DOCKER_COMPOSE) logs -f api

## logs-db: Display only PostgreSQL container logs
logs-db:
	$(DOCKER_COMPOSE) logs -f postgres

## ps: Show running Docker containers
ps:
	@echo "$(BLUE)Running containers:$(NC)"
	$(DOCKER_COMPOSE) ps

## db-init: Initialize database
db-init:
	@echo "Initializing database...$(NC)"
	$(PYTHON) init_db.py

## db-drop: Stop database and remove volumes
db-drop:
	@echo "Dropping database volumes...$(NC)"
	$(DOCKER_COMPOSE) down -v

## clean: Remove Python cache files and directories
clean:
	@echo "Cleaning Python cache files...$(NC)"
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Cache cleaned$(NC)"


## rebuild: Rebuild Docker images without cache
rebuild:
	@echo "Rebuilding Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache

## restart: Restart Docker containers
restart: down up
	@echo "✓ Services restarted$(NC)"

.DEFAULT_GOAL := help

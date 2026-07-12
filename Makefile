.PHONY: help install test lint format clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

test: ## Run tests
	npm test

lint: ## Run linter
	npm run lint 2>/dev/null || npx eslint . --ext .ts,.tsx,.js,.jsx 2>/dev/null || echo "No linter configured"

format: ## Format code
	npx prettier --write . 2>/dev/null || echo "No formatter configured"

clean: ## Clean artifacts
	rm -rf node_modules/ dist/ build/ coverage/

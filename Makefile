# StellarRec™ Development Makefile

.PHONY: help install start stop build clean test logs

# Default target
help:
	@echo "StellarRec™ Development Commands:"
	@echo ""
	@echo "  make install    - Install all dependencies"
	@echo "  make start      - Start all services with Docker"
	@echo "  make stop       - Stop all services"
	@echo "  make build      - Build all Docker images"
	@echo "  make clean      - Clean up Docker resources"
	@echo "  make test       - Run all tests"
	@echo "  make logs       - Show logs for all services"
	@echo "  make db-reset   - Reset database with fresh schema"
	@echo "  make dev        - Start development environment"
	@echo ""

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ All dependencies installed"

# Start all services
start:
	@echo "Starting StellarRec™ services..."
	docker-compose up -d
	@echo "✅ All services started"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"
	@echo "pgAdmin: http://localhost:5050"

# Stop all services
stop:
	@echo "Stopping StellarRec™ services..."
	docker-compose down
	@echo "✅ All services stopped"

# Build Docker images
build:
	@echo "Building Docker images..."
	docker-compose build
	@echo "✅ Docker images built"

# Clean up Docker resources
clean:
	@echo "Cleaning up Docker resources..."
	docker-compose down -v --rmi all --remove-orphans
	docker system prune -f
	@echo "✅ Docker resources cleaned"

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && npm test
	@echo "Running frontend tests..."
	cd frontend && npm test -- --watchAll=false
	@echo "✅ All tests completed"

# Show logs
logs:
	docker-compose logs -f

# Reset database
db-reset:
	@echo "Resetting database..."
	docker-compose stop postgres
	docker-compose rm -f postgres
	docker volume rm stellarrec-system_postgres_data || true
	docker-compose up -d postgres
	@echo "✅ Database reset complete"

# Development environment
dev: install start
	@echo "✅ Development environment ready!"
	@echo ""
	@echo "Services running:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:3001"
	@echo "  pgAdmin:  http://localhost:5050 (admin@stellarrec.com / admin123)"
	@echo ""
	@echo "To view logs: make logs"
	@echo "To stop:      make stop"

# Health check
health:
	@echo "Checking service health..."
	@curl -s http://localhost:3001/health | jq . || echo "Backend not responding"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is running" || echo "❌ Frontend not responding"
	@docker-compose ps
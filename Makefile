.PHONY: dev build test seed docker-up docker-down clean

dev:
	python scripts/run_local.py

seed:
	python scripts/generate_synthetic_data.py
	python pipelines/transformations/run_pipeline.py
	python ml/training/train.py
	python scripts/seed_demo.py
	python sample-documents/create_sample_pdf.py

test:
	pytest tests -v

build:
	cd frontend && npm run build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down -v

clean:
	rm -rf backend/cartrust.db uploads/ dist/

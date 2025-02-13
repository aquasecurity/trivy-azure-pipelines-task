default: build

.PHONY: clean
clean:
	rm *.vsix || true
	rm trivy-task/*.js || true

.PHONY: lint
lint:
	cd ui && npm install -f && npm run lint
	cd trivy-task && npm install -f && npm run lint

.PHONY: format
format:
	cd ui && npm install -f && npm run format
	cd trivy-task && npm install -f && npm run format

.PHONY: build-ui
build-ui: clean
	cd ui && npm install -f && npm run build

.PHONY: build-task
build-task: clean
	cd trivy-task && npm install -f && npm run build

.PHONY: build
build: clean build-task build-ui

.PHONY: package
package: build
	tfx extension create --manifest-globs vss-extension.json

.PHONY: package-dev
package-dev: build
	tfx extension create --manifest-globs vss-extension.dev.json

.PHONY: local
local: build-task
	cd trivy-task && INPUT_VERSION=v0.29.2 INPUT_PATH=. node index.js

.PHONY: local-image
local-image: build-task
	cd trivy-task && INPUT_VERSION=v0.29.2 INPUT_IMAGE=ubuntu node index.js

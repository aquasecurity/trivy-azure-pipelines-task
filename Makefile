default: build

.PHONY: build
build:
	cd trivy && tsc index.ts

.PHONY: package
package: build
	tfx extension create --manifest-globs vss-extension.json

.PHONY: publish
publish: package
	tfx extension publish --manifest-globs vss-extension.json --share-with liamgalvin
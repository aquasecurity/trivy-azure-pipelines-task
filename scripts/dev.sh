#!/usr/bin/env bash

set -e

echo "Base version: ${RELEASE_VERSION}"
SIMPLE_VERSION=$(echo "${RELEASE_VERSION}" | sed 's/dev\(.*\)/\1/')
echo "Simple version: ${SIMPLE_VERSION}"
sed -i s/VERSION_PLACEHOLDER/$SIMPLE_VERSION/ vss-extension.dev.json
SPLIT_VERSION=$(echo $SIMPLE_VERSION | awk -F. {'printf "\"Major\":%d,\"Minor\":%d,\"Patch\":%d", $1, $2, $3'})
echo "Split version: ${SPLIT_VERSION}"
sed -i "s/VERSION_PLACEHOLDER/$SPLIT_VERSION/" trivy-task/task.json
make package-dev
tfx extension publish --manifest-globs vss-extension.dev.json --token "${PUBLISHER_TOKEN}" --share-with owenrumney0307

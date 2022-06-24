#!/usr/bin/env bash

set -e

echo "Base version: ${RELEASE_VERSION}"
SIMPLE_VERSION=$(echo "${RELEASE_VERSION}" | sed 's/v\(.*\)/\1/')
echo "Simple version: ${SIMPLE_VERSION}"
sed -i s/VERSION_PLACEHOLDER/$SIMPLE_VERSION/ vss-extension.json
SPLIT_VERSION=$(echo $SIMPLE_VERSION | awk -F. {'printf "\"Major\":%d,\"Minor\":%d,\"Patch\":%d", $1, $2, $3'})
echo "Split version: ${SPLIT_VERSION}"
sed -i "s/VERSION_PLACEHOLDER/$SPLIT_VERSION/" trivy-task/task.json
make package
tfx extension publish --manifest-globs vss-extension.json --token "${PUBLISHER_TOKEN}"

#!/usr/bin/env bash

HUB_USER='lamistage'
HUB_PASSWORD='ch=Y,E+JKt)g7Q6'
PROJECT='pick-me-frontend'

DIR="`dirname "$(readlink -f "$0")"`"

if [[ -z "${project}" ]]; then
    project=$PROJECT
fi

build() {
    docker build \
    -t ${HUB_USER}/${project}:`cat ${DIR}/version` \
    -f ${DIR}/Dockerfile ${DIR}/..
}

clean() {
    docker rmi ${HUB_USER}/${project}:`cat ${DIR}/version`
}

push() {
    docker login -u $HUB_USER -p $HUB_PASSWORD

    docker push ${HUB_USER}/${project}:`cat ${DIR}/version`
}

$1
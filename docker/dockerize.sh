#!/usr/bin/env bash

DIR="`dirname "$(readlink -f "$0")"`"

cd '../../backend'

HUB_USER=$(grep 'HUB_USER=' .env | cut -c10-)
HUB_PASSWORD=$(grep 'HUB_PASSWORD=' .env | cut -c14-)
PROJECT=$(grep 'PROJECT_FRONTEND=' .env | cut -c18-)

if [[ -z "${project}" ]]; then
    project=$PROJECT
fi

current_version=$(cat ${DIR}/version)

while getopts ":Mm" opt; do
    case $opt in
        M) increment="major";;
        m) increment="minor";;
        \?) echo "Invalid key" -$OPTARG >&2; exit 1;;
    esac
done

shift $((OPTIND-1))

clean() {
    echo "Cleaning ${HUB_USER}/${project}:${current_version}"

    docker rmi ${HUB_USER}/${project}:${current_version}
}

update_version() {
    IFS='.' read -ra parts <<< "$current_version"
    major=${parts[0]}
    minor=${parts[1]}
    patch=${parts[2]}

    case $increment in
        "major")
            ((major++))
            minor=0
            patch=0
            ;;
        "minor")
            ((minor++))
            patch=0
            ;;
        *)
            ((patch++))
            ;;
    esac

    new_version="${major}.${minor}.${patch}"
    echo $new_version > ${DIR}/version
    echo $new_version
}

build() {
    echo "Building ${HUB_USER}/${project}:${new_version}"

    docker build \
    -t ${HUB_USER}/${project}:${new_version} \
    -f ${DIR}/Dockerfile ${DIR}/..
}

push() {
    echo "Pushing ${HUB_USER}/${project}:${new_version}"

    docker login -u $HUB_USER -p $HUB_PASSWORD

    docker push ${HUB_USER}/${project}:`cat ${DIR}/version`
}

clean
new_version=$(update_version)
build
push
#!/usr/bin/env bash

HUB_USER='lamistage'
HUB_PASSWORD='ch=Y,E+JKt)g7Q6'
PROJECT='pick-me-frontend'

DIR="`dirname "$(readlink -f "$0")"`"

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
#!/bin/bash
source secrets.sh

if [ -e src/settings.json ]; then
    exit 0;
fi

RESPONSE=$(curl "$REACT_APP_SITE_SETTINGS_URL");

if [ $? -ne 0 ]; then
    exit $?;
fi

echo $RESPONSE > src/settings.json;

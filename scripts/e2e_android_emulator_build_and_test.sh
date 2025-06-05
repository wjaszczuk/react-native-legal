#!/bin/bash

set -x
yarn workspace react-native-legal-bare-example android:release
adb shell "screenrecord --bugreport /data/local/tmp/recording.mp4 & echo \$! > /data/local/tmp/screenrecord_pid.txt" &
set +e
yarn workspace react-native-legal-bare-example e2e:android
TEST_STATUS=$?
adb shell "kill -2 \$(cat /data/local/tmp/screenrecord_pid.txt)"
sleep 1
adb pull /data/local/tmp/recording.mp4 .
exit $TEST_STATUS

#!/bin/bash

sdkmanager --list

set -x
echo "Starting the screen recording..."
adb shell "screenrecord --bugreport /data/local/tmp/testRecording.mp4 & echo \$! > /data/local/tmp/screenrecord_pid.txt" &
set +e
yarn workspace react-native-legal-bare-example e2e:android
TEST_STATUS=$?
echo "Test run completed with status $TEST_STATUS"
adb shell "kill -2 \$(cat /data/local/tmp/screenrecord_pid.txt)"
# Wait for the screen recording process to exit
sleep 1
adb pull /data/local/tmp/testRecording.mp4 .
exit $TEST_STATUS

#!/bin/bash

INPUT_URL="$1"
OUTPUT_DIR="$2"
STREAM_NAME="$3"  # Use a second argument or default to "default_stream_name"
SEGMENT_DURATION=3
PLAYLIST_SIZE=3
PLAYLIST_NAME="$4"
TOTAL_DURATION=$((10 * 10))
mkdir -p "$OUTPUT_DIR/$STREAM_NAME"

ffmpeg -i "$INPUT_URL" \
  -c:v libx264 -preset faster -tune zerolatency \
  -crf 18 -maxrate 2000k -bufsize 4000k \
  -vf "scale=1280:720:flags=lanczos" \
  -c:a aac -ar 44100 -b:a 128k \
  -f hls \
  -hls_time $SEGMENT_DURATION \
  -hls_list_size $PLAYLIST_SIZE \
  -hls_segment_filename "$OUTPUT_DIR/$STREAM_NAME/$PLAYLIST_NAME%03d.ts" \
  -t $TOTAL_DURATION \
  "$OUTPUT_DIR/$STREAM_NAME/$PLAYLIST_NAME.m3u8"

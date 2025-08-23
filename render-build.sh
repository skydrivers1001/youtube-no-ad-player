#!/usr/bin/env bash
# exit on error
set -o errexit

# 確保環境變數在構建過程中可用
export REACT_APP_YOUTUBE_API_KEY=$REACT_APP_YOUTUBE_API_KEY
export REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
export REACT_APP_GOOGLE_CLIENT_SECRET=$REACT_APP_GOOGLE_CLIENT_SECRET

# 安裝依賴並構建應用
npm install
npm run build
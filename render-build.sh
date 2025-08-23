#!/usr/bin/env bash
# exit on error
set -o errexit

# 顯示當前目錄和 Node.js 版本
echo "Current directory: $(pwd)"
echo "Node.js version: $(node -v)"

# 確保環境變數在構建過程中可用
export REACT_APP_YOUTUBE_API_KEY=$REACT_APP_YOUTUBE_API_KEY
export REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
export REACT_APP_GOOGLE_CLIENT_SECRET=$REACT_APP_GOOGLE_CLIENT_SECRET

# 增加 Node.js 堆內存限制，避免記憶體溢出錯誤
export NODE_OPTIONS="--max-old-space-size=4096"
echo "NODE_OPTIONS: $NODE_OPTIONS"

# 安裝依賴並構建應用
echo "Installing dependencies..."
npm ci --include=dev

# 確保 react-scripts 可執行
echo "Setting up PATH for react-scripts..."
export PATH="$PATH:$(pwd)/node_modules/.bin"
ls -la $(pwd)/node_modules/.bin/
echo "react-scripts path: $(which react-scripts || echo 'react-scripts not found')"

# 直接使用 react-scripts 構建應用
echo "Building application..."
$(pwd)/node_modules/.bin/react-scripts build
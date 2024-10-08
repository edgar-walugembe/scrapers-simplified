#!/bin/bash

# Update system and install required libraries for Playwright
apt-get update && apt-get install -y \
    libgstgl-1.0-0 \
    libgstcodecparsers-1.0-0 \
    libenchant-2-2 \
    libsecret-1-0 \
    libmanette-0.2-0 \
    libgles2-mesa

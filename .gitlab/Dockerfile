# syntax=docker/dockerfile:1
FROM node:20.17-slim

RUN apt-get -qq update && apt-get -qq install \
    git \
    python3 \
    zip \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable yarn

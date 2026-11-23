FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
ENV NODE_ENV=production
# APP=backend or APP=websocket (set as an environment variable on the host)
CMD ["sh","-c","cd apps/${APP:-backend} && bun index.ts"]

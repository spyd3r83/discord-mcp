FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "src/index.ts"]

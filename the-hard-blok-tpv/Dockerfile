FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Keep node_modules from build stage so runtime and CLI scripts are available.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY package.json ./

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

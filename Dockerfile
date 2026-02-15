FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]

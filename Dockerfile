# Generic container image for any Docker host (Koyeb, Fly.io, a VPS, ...)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=7000
EXPOSE 7000
USER node
CMD ["node", "server.js"]

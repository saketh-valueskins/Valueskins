FROM node:20-alpine

WORKDIR /app

COPY backend-node/package.json ./
RUN npm install --only=production

COPY backend-node/src ./src

USER node
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health/live', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]

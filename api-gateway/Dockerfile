FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Use `npm ci` when a lockfile exists, otherwise fall back to `npm install --omit=dev`
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --omit=dev; fi

COPY . .

EXPOSE 8080

CMD ["npm", "start"]

FROM node:20-alpine

WORKDIR /app

COPY server.js ./
COPY dist ./dist

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]

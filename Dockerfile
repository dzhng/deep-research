FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

COPY . .

ENV NODE_ENV=development

COPY .env.local .env.local

CMD ["npm", "run", "docker"]


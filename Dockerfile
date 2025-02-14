FROM node:18-alpine

WORKDIR /app

COPY . .
COPY package.json ./
COPY .env ./.env

RUN npm install

CMD ["npm", "run", "docker"]

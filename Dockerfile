FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env.local .env.local

CMD ["npm", "run", "docker"]


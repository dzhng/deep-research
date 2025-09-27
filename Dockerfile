FROM node:18-alpine

WORKDIR /app

COPY . .
COPY package.json ./

RUN npm install

CMD ["npm", "run", "start:ws"]

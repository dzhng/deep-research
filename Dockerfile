FROM node:22

WORKDIR /app

COPY . .
COPY package.json ./
COPY .env ./.env

# Install backend dependencies
RUN npm install

# Install frontend dependencies
WORKDIR /app/apps/frontend
COPY apps/frontend/package.json ./
COPY apps/frontend/package-lock.json ./
RUN npm install

# Set the working directory back to the root
WORKDIR /app

CMD ["npm", "run", "docker"]

FROM node:22-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]

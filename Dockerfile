FROM node:18-alpine

ENV SSPAI_TOKEN=test

COPY package*.json .

RUN npm i --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]


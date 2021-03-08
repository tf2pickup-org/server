FROM node:12

COPY package*.json \
  nest-cli.json \
  tsconfig*.json \
  ./

RUN npm install \
  && npm run build

CMD ["npm", "run", "prod"]

EXPOSE 3000

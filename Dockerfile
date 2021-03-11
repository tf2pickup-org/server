FROM node:12 AS development

WORKDIR /tf2pickup.pl

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


FROM node:12 AS production

WORKDIR /tf2pickup.pl

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY package*.json ./

RUN npm install --only=production

COPY configs ./configs
COPY --from=development /tf2pickup.pl/dist ./dist

CMD ["npm", "run", "prod"]

EXPOSE 3000

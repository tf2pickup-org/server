FROM node:12 AS build
WORKDIR /tf2pickup.pl

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM node:12
WORKDIR /tf2pickup.pl

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY package*.json ./

RUN npm install --only=production

COPY --from=build /tf2pickup.pl/configs ./configs
COPY --from=build /tf2pickup.pl/dist ./dist
COPY migrations ./migrations

USER node
CMD [ "npm", "run", "prod" ]

EXPOSE 3000

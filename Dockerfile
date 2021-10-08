FROM node:lts-alpine AS build
WORKDIR /tf2pickup.pl

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
RUN yarn install --immutable

COPY . .
RUN yarn build


FROM node:lts-alpine AS package-install
WORKDIR /tf2pickup.pl

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins

RUN yarn workspaces focus --production


FROM node:lts-alpine
WORKDIR /tf2pickup.pl

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY package.json ./
COPY --from=build /tf2pickup.pl/dist ./dist
COPY --from=build /tf2pickup.pl/configs/queue ./configs/queue
COPY --from=package-install /tf2pickup.pl/node_modules ./node_modules
COPY client ./client
COPY migrations ./migrations

USER node
CMD [ "node", "dist/src/main" ]

EXPOSE 3000

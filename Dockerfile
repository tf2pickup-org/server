FROM node:lts-alpine AS build
WORKDIR /tf2pickup.pl

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
RUN yarn install --immutable

COPY . .
RUN yarn build


FROM node:lts-alpine
WORKDIR /tf2pickup.pl

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY --from=build /tf2pickup.pl/.yarn/cache .yarn/cache

RUN yarn workspaces focus --production \
 && yarn cache clean

COPY --from=build /tf2pickup.pl/configs ./configs
COPY --from=build /tf2pickup.pl/dist ./dist
COPY migrations ./migrations

USER node
CMD [ "yarn", "prod" ]

EXPOSE 3000

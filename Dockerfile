FROM node:lts-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /tf2pickup.pl
WORKDIR /tf2pickup.pl

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN apt update && apt install -y --no-install-recommends openssl
COPY --from=prod-deps /tf2pickup.pl/node_modules /tf2pickup.pl/node_modules
COPY --from=build /tf2pickup.pl/dist /tf2pickup.pl/dist
COPY --from=build /tf2pickup.pl/configs/queue /tf2pickup.pl/configs/queue
COPY --from=build /tf2pickup.pl/client /tf2pickup.pl/client
COPY --from=build /tf2pickup.pl/migrations /tf2pickup.pl/migrations

USER node
CMD [ "node", "dist/src/main" ]
EXPOSE 3000

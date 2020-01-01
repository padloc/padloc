
FROM node

ENV PL_PWA_PORT=8080
ENV PL_PWA_DIR=/pwa

EXPOSE 8080

VOLUME ["/pwa"]

WORKDIR /padloc

# Only copy over the packages files of all required packages.
# This will ensure that we don't have to install all dependencies
# again if any source files change.
COPY package*.json lerna.json tsconfig.json ./
COPY packages/pwa/package*.json ./packages/pwa/
COPY packages/app/package*.json ./packages/app/
COPY packages/core/package*.json ./packages/core/
COPY packages/locale/package*.json ./packages/locale/

# Install dependencies and bootstrap packages
RUN npm ci --unsafe-perm

# Now copy over source files and assets
COPY packages/pwa/src ./packages/pwa/src
COPY packages/pwa/assets ./packages/pwa/assets
COPY packages/pwa/tsconfig.json packages/pwa/webpack.config.js ./packages/pwa/
COPY packages/app/src ./packages/app/src
COPY packages/app/assets ./packages/app/assets
COPY packages/app/types ./packages/app/types
COPY packages/app/tsconfig.json ./packages/app/
COPY packages/core/src ./packages/core/src
COPY packages/core/vendor ./packages/core/vendor
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/locale/src ./packages/locale/src
COPY packages/locale/res ./packages/locale/res
COPY packages/locale/tsconfig.json ./packages/locale/

ENTRYPOINT ["npx", "lerna", "run", "--scope", "@padloc/pwa"]

CMD ["build_and_start"]

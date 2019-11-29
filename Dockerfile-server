FROM node

ENV PL_SERVER_PORT=3000
ENV PL_BILLING_PORT=4000
ENV PL_DB_PATH=/data
ENV PL_ATTACHMENTS_PATH=/docs
ENV PL_LOG_DIR=/logs
ENV PL_REPL_HISTORY=.pl_repl_history

EXPOSE 3000
EXPOSE 4000

VOLUME ["/data", "/docs", "/logs"]

WORKDIR /padloc

# Only copy over the packages files of all required packages.
# This will ensure that we don't have to install all dependencies
# again if any source files change.
COPY package*.json lerna.json tsconfig.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/core/package*.json ./packages/core/
COPY packages/locale/package*.json ./packages/locale/

# Install dependencies and bootstrap packages
RUN npm ci --unsafe-perm

# Now copy over source files and assets
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/core/src ./packages/core/src
COPY packages/core/vendor ./packages/core/vendor
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/locale/src ./packages/locale/src
COPY packages/locale/res ./packages/locale/res
COPY packages/locale/tsconfig.json ./packages/locale/

ENTRYPOINT ["npx", "lerna", "run", "--scope", "@padloc/server"]

CMD ["start"]

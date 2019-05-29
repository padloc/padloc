FROM node

ENV PL_SERVER_PORT=3000
ENV PL_CLIENT_PORT=8080
ENV PL_DB_PATH=/data
ENV PL_ATTACHMENTS_PATH=/docs

EXPOSE 3000
EXPOSE 8080

VOLUME ["/data", "/docs"]

WORKDIR /home/padloc/

COPY . .

RUN npm ci --unsafe-perm
RUN npm run build

CMD ["npm", "start"]

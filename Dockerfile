FROM node:18-alpine
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app
WORKDIR /usr/src/app

COPY --chown=node:node . .
RUN npm install
USER node

CMD ["npm", "run", "start"]

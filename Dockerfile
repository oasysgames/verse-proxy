###################
## BUILD
###################
FROM node:18-alpine As build
WORKDIR /usr/src/app

# COPY --chown=node:node package*.json ./
# COPY --chown=node:node . .

# USER node

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

###################
## PRODUCTION
###################
FROM node:18-alpine As production

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

USER node

CMD [ "node", "dist/main.js" ]

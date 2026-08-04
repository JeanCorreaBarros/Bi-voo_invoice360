FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate --schema=prisma/platform/schema.prisma \
 && npx prisma generate --schema=prisma/tenant/schema.prisma

EXPOSE 3000

CMD ["npm", "run", "start"]

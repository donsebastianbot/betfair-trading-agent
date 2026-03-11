FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm install
COPY . .
RUN npm run prisma:generate -w apps/api && npm run build -w apps/api
EXPOSE 4001
CMD ["npm","run","start","-w","apps/api"]